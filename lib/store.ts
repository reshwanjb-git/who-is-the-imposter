/**
 * lib/store.ts
 *
 * De opslag-interface. De game-engine (lib/game-engine.ts) kent geen enkel
 * detail van Supabase of van een in-memory Map — hij roept alleen deze
 * methodes aan. Daardoor kan exact dezelfde spellogica draaien op:
 *   - lib/memory-store.ts   (testscript, scripts/simulate.ts, geen netwerk nodig)
 *   - lib/supabase-store.ts (productie, via de service_role key in /api/*)
 *
 * Precies de zes tabellen uit de bouwprompt: rooms, players, rounds,
 * assignments, answers, votes. Er worden hier geen extra tabellen bij
 * verzonnen — waar de spec iets vraagt dat niet in dit datamodel past
 * (bv. "wie heeft al op Verder gedrukt"), lost de game-engine dat op zonder
 * nieuwe kolommen (zie de opmerkingen daar).
 */

import type { Answer, Assignment, Player, Room, Round, Vote } from './types';

export interface Store {
  // ---- rooms -----------------------------------------------------------
  insertRoom(row: Omit<Room, 'id' | 'created_at' | 'last_active_at'>): Promise<Room>;
  getRoomByCode(code: string): Promise<Room | null>;
  getRoomById(id: string): Promise<Room | null>;
  updateRoom(id: string, patch: Partial<Room>): Promise<Room>;
  /** Verwijdert rooms (en hun rounds/assignments/answers/votes/players) die langer dan `olderThanMs` inactief zijn. */
  deleteStaleRooms(olderThanMs: number): Promise<string[]>;

  // ---- players -----------------------------------------------------------
  insertPlayer(row: Omit<Player, 'id' | 'joined_at' | 'last_seen_at'>): Promise<Player>;
  getPlayerByToken(token: string): Promise<Player | null>;
  getPlayerById(id: string): Promise<Player | null>;
  listPlayers(roomId: string): Promise<Player[]>;
  updatePlayer(id: string, patch: Partial<Player>): Promise<Player>;

  // ---- rounds -----------------------------------------------------------
  insertRound(row: Omit<Round, 'id' | 'created_at'>): Promise<Round>;
  getRound(id: string): Promise<Round | null>;
  updateRound(id: string, patch: Partial<Round>): Promise<Round>;
  listRoundsForRoom(roomId: string): Promise<Round[]>;

  // ---- assignments -----------------------------------------------------------
  insertAssignments(rows: Omit<Assignment, 'id'>[]): Promise<Assignment[]>;
  listAssignments(roundId: string): Promise<Assignment[]>;
  getAssignmentForPlayer(roundId: string, playerId: string): Promise<Assignment | null>;

  // ---- answers -----------------------------------------------------------
  upsertAnswer(input: { round_id: string; player_id: string; text: string }): Promise<Answer>;
  listAnswers(roundId: string): Promise<Answer[]>;

  // ---- votes -----------------------------------------------------------
  upsertVote(input: {
    round_id: string;
    ballot_number: number;
    player_id: string;
    target_player_id: string;
  }): Promise<Vote>;
  listVotes(roundId: string, ballotNumber: number): Promise<Vote[]>;
}
