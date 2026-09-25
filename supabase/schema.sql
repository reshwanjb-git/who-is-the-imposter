-- supabase/schema.sql
--
-- Voer dit één keer uit in de Supabase SQL Editor van je project
-- (project → SQL Editor → New query → plak dit hele bestand → Run).
--
-- Zes tabellen, exact zoals in de bouwprompt: rooms, players, rounds,
-- assignments, answers, votes.
--
-- Beveiligingsmodel:
--   - RLS staat AAN op alle tabellen.
--   - De 'anon'-rol (de client, via de publieke anon key) krijgt UITSLUITEND
--     leesrecht op rooms.code, rooms.phase en rooms.state_version — puur om
--     realtime te kunnen detecteren dat er iets veranderd is.
--   - Alles daadwerkelijk lezen/schrijven (wie de imposter is, de vragen,
--     antwoorden, stemmen) loopt via de Vercel-serverless-functions in /api,
--     met de service_role key. Die key omzeilt RLS volledig — dat is precies
--     waarom hij NOOIT in de client mag komen (zie .env.example).
--   - players, rounds, assignments, answers, votes: geen enkele grant voor
--     anon. Standaard dus volledig ontoegankelijk voor de browser.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------------
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_player_id uuid,
  phase text not null default 'lobby'
    check (phase in ('lobby','answering','question_reveal','answers','voting','result')),
  language text not null check (language in ('nl','en')),
  category text not null default 'random',
  last_used_category text,
  current_round_id uuid,
  round_number integer not null default 0,
  state_version integer not null default 0,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

alter table rooms enable row level security;

-- Iedereen (ook anoniem) mag rows zien — maar dankzij de column-grant
-- hieronder komt er alleen code/phase/state_version mee terug via de
-- REST/Realtime-laag.
drop policy if exists "anon kan rooms zien" on rooms;
create policy "anon kan rooms zien" on rooms for select using (true);

revoke all on rooms from anon;
grant select (code, phase, state_version) on rooms to anon;

-- Zet 'rooms' in de realtime-publicatie zodat de client op state_version kan
-- luisteren zonder te pollen. Geen geheime data in deze tabel, dus veilig.
alter publication supabase_realtime add table rooms;

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  emoji text not null,
  player_token text not null unique,
  is_host boolean not null default false,
  is_connected boolean not null default true,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  kicked_at timestamptz
);

alter table players enable row level security;
-- Geen policies, geen grants voor anon: alleen service_role kan hierbij.
revoke all on players from anon;

create index if not exists players_room_id_idx on players(room_id);
create index if not exists players_token_idx on players(player_token);

-- ---------------------------------------------------------------------------
-- rounds
-- ---------------------------------------------------------------------------
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  round_number integer not null,
  category text not null,
  main_question text not null,
  imposter_question text not null,
  imposter_player_id uuid not null references players(id),
  phase text not null
    check (phase in ('lobby','answering','question_reveal','answers','voting','result')),
  tiebreak_number integer not null default 0,
  used_by_all_pair_key text not null,
  created_at timestamptz not null default now()
);

alter table rounds enable row level security;
revoke all on rounds from anon;

create index if not exists rounds_room_id_idx on rounds(room_id);

alter table rooms
  add constraint rooms_current_round_id_fkey
  foreign key (current_round_id) references rounds(id) on delete set null;

-- ---------------------------------------------------------------------------
-- assignments  (bepaalt wie welke vraag ziet — nooit anon-leesbaar)
-- ---------------------------------------------------------------------------
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  question_text text not null,
  unique (round_id, player_id)
);

alter table assignments enable row level security;
revoke all on assignments from anon;

create index if not exists assignments_round_id_idx on assignments(round_id);

-- ---------------------------------------------------------------------------
-- answers
-- ---------------------------------------------------------------------------
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);

alter table answers enable row level security;
revoke all on answers from anon;

create index if not exists answers_round_id_idx on answers(round_id);

-- ---------------------------------------------------------------------------
-- votes
-- ---------------------------------------------------------------------------
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  ballot_number integer not null default 0,
  player_id uuid not null references players(id) on delete cascade,
  target_player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (round_id, ballot_number, player_id)
);

alter table votes enable row level security;
revoke all on votes from anon;

create index if not exists votes_round_id_idx on votes(round_id, ballot_number);

-- ---------------------------------------------------------------------------
-- Opruimen van rooms die 12+ uur inactief zijn
-- ---------------------------------------------------------------------------
-- Wordt aangeroepen vanuit de Vercel Cron job /api/cleanup (zie vercel.json —
-- draait elk uur). Dat is dezelfde logica als lib/game-engine.ts
-- cleanupStaleRooms(), maar als losse SQL-functie zodat je 'm ook handmatig
-- kan draaien vanuit de SQL Editor als je wil opschonen zonder te deployen.
create or replace function cleanup_stale_rooms(older_than_hours integer default 12)
returns integer
language plpgsql
security definer
as $$
declare
  removed integer;
begin
  with deleted as (
    delete from rooms
    where last_active_at < now() - (older_than_hours || ' hours')::interval
    returning id
  )
  select count(*) into removed from deleted;
  return removed;
end;
$$;
