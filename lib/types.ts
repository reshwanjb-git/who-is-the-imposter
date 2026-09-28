/**
 * lib/types.ts
 *
 * Gedeelde types voor het datamodel. Zie imposter-app-cowork-prompt.md voor de
 * volledige spec. Deze types worden gebruikt door zowel de store-implementaties
 * (memory-store.ts / supabase-store.ts) als de game-engine en de API-routes.
 */

import type { CategoryId, Language } from './categories.js';

export type Phase =
  | 'lobby'
  | 'answering'
  | 'question_reveal'
  | 'answers'
  | 'voting'
  | 'result';

export type CategorySetting = CategoryId | 'random';

export interface Room {
  id: string;
  code: string;
  host_player_id: string;
  phase: Phase;
  language: Language;
  category: CategorySetting;
  /** Categorie die daadwerkelijk gebruikt is voor de huidige/laatste ronde (nooit 'random'). */
  last_used_category: CategoryId | null;
  current_round_id: string | null;
  round_number: number;
  state_version: number;
  created_at: string;
  last_active_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  emoji: string;
  player_token: string;
  is_host: boolean;
  is_connected: boolean;
  joined_at: string;
  last_seen_at: string;
  kicked_at: string | null;
}

export interface Round {
  id: string;
  room_id: string;
  round_number: number;
  category: CategoryId;
  main_question: string;
  imposter_question: string;
  imposter_player_id: string;
  phase: Phase;
  tiebreak_number: number;
  used_by_all_pair_key: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  round_id: string;
  player_id: string;
  question_text: string;
}

export interface Answer {
  id: string;
  round_id: string;
  player_id: string;
  text: string;
  created_at: string;
}

export interface Vote {
  id: string;
  round_id: string;
  ballot_number: number;
  player_id: string;
  target_player_id: string;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/* Client-facing (gepersonaliseerde) state                                    */
/* -------------------------------------------------------------------------- */

export interface PublicPlayer {
  id: string;
  name: string;
  emoji: string;
  is_host: boolean;
  is_connected: boolean;
  has_answered?: boolean;
  has_voted?: boolean;
}

export interface RevealedAnswer {
  player_id: string;
  name: string;
  emoji: string;
  text: string;
}

export interface RevealedVote {
  player_id: string;
  target_player_id: string;
}

export interface ClientState {
  room: {
    code: string;
    phase: Phase;
    language: Language;
    category: CategorySetting;
    round_number: number;
    state_version: number;
  };
  me: {
    id: string;
    name: string;
    emoji: string;
    is_host: boolean;
    my_question: string | null;
    my_answer: string | null;
    my_vote: string | null;
    /** Alleen gezet zodra fase >= question_reveal en ik de imposter ben. */
    i_am_imposter: boolean | null;
  };
  players: PublicPlayer[];
  round: {
    id: string;
    category: string;
    /** Alleen zichtbaar vanaf question_reveal. */
    main_question: string | null;
    /** Alleen zichtbaar vanaf result. */
    imposter_question: string | null;
    /** Alleen zichtbaar vanaf result. */
    imposter_player_id: string | null;
    tiebreak_number: number;
  } | null;
  /** Alleen gevuld vanaf fase 'answers' (en later). */
  answers: RevealedAnswer[] | null;
  /** Alleen gevuld vanaf fase 'result'. */
  votes: RevealedVote[] | null;
  /** Alleen gevuld vanaf fase 'result'. */
  result: {
    imposter_caught: boolean;
    vote_counts: Record<string, number>;
    was_tie: boolean;
  } | null;
  error?: string;
}

export interface GameError {
  code:
    | 'room_not_found'
    | 'room_full'
    | 'invalid_token'
    | 'not_host'
    | 'wrong_phase'
    | 'round_broken_too_few_players'
    | 'already_answered'
    | 'already_voted'
    | 'name_required'
    | 'validation_error';
  message: string;
}

export class GameEngineError extends Error {
  code: GameError['code'];
  constructor(code: GameError['code'], message: string) {
    super(message);
    this.code = code;
  }
}
