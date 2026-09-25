# Who is the Imposter

Multiplayer "Wie is de imposter"-partyspel voor 3–10 spelers, gebouwd met
React + Vite + TypeScript, Vercel serverless functions en Supabase
(Postgres + Realtime). Zie `imposter-app-cowork-prompt.md` (in de map erboven)
voor de volledige spec.

## Snel starten (lokaal, met mock-data)

```bash
npm install
npm test          # volledige spellogica-tests (geen Supabase nodig)
npm run dev        # frontend alleen — API-routes werken pas na Supabase-setup
```

## Live zetten

Volg `HANDLEIDING.md` in deze map: stap voor stap, van nul voorkennis naar
een werkende link op je telefoon.

## Structuur

- `lib/` — alle spellogica + het datamodel, los van Supabase (`store.ts`
  is de interface; `memory-store.ts` en `supabase-store.ts` de twee
  implementaties). `question-prompt.ts`, `categories.ts` en
  `explain-prompt.ts` zijn de kant-en-klare, getrainde AI-generator-bestanden.
- `api/` — Vercel serverless functions; dunne wrappers om `lib/game-engine.ts`.
- `src/` — de React-frontend (Ocean Depths-thema, mobile-first, PWA).
- `supabase/schema.sql` — eenmalig uitvoeren in de Supabase SQL Editor.
- `tests/` — `npm test` runt de volledige spelflow (join, antwoorden,
  onthulling, stemmen, gelijkspel/tiebreak, herverbinden, AFK-forceren)
  tegen een in-memory database.
