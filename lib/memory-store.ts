/**
 * lib/memory-store.ts
 *
 * In-memory implementatie van de Store-interface. Gebruikt door
 * scripts/simulate.ts en tests/*.test.ts, zodat de volledige spellogica
 * (game-engine.ts) getest kan worden zonder dat er al een Supabase-project
 * bestaat. Nooit gebruiken in productie — elke Vercel-functie-invocatie
 * krijgt zijn eigen geheugen, dus dit deelt niets tussen requests.
 */

import type { Answer, Assignment, Player, Room, Round, Vote } from './types';
import type { Store } from './store';
import { makeToken as generateToken } from './token';

function randomId(): string {
  return crypto.randomUUID();
}

export class MemoryStore implements Store {
  rooms = new Map<string, Room>();
  players = new Map<string, Player>();
  playerTokens = new Map<string, string>(); // token -> playerId
  rounds = new Map<string, Round>();
  assignments = new Map<string, Assignment[]>(); // roundId -> assignments
  answers = new Map<string, Answer[]>(); // roundId -> answers
  votes = new Map<string, Vote[]>(); // roundId -> votes (all ballots)

  async insertRoom(row: Omit<Room, 'id' | 'created_at' | 'last_active_at'>): Promise<Room> {
    const now = new Date().toISOString();
    const room: Room = { ...row, id: randomId(), created_at: now, last_active_at: now };
    this.rooms.set(room.id, room);
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | null> {
    for (const r of this.rooms.values()) if (r.code === code) return r;
    return null;
  }

  async getRoomById(id: string): Promise<Room | null> {
    return this.rooms.get(id) ?? null;
  }

  async updateRoom(id: string, patch: Partial<Room>): Promise<Room> {
    const existing = this.rooms.get(id);
    if (!existing) throw new Error(`Room ${id} bestaat niet`);
    const updated = { ...existing, ...patch };
    this.rooms.set(id, updated);
    return updated;
  }

  async deleteStaleRooms(olderThanMs: number): Promise<string[]> {
    const cutoff = Date.now() - olderThanMs;
    const staleIds: string[] = [];
    for (const room of this.rooms.values()) {
      if (new Date(room.last_active_at).getTime() < cutoff) staleIds.push(room.id);
    }
    for (const roomId of staleIds) {
      const roundIds = [...this.rounds.values()].filter((r) => r.room_id === roomId).map((r) => r.id);
      for (const rid of roundIds) {
        this.assignments.delete(rid);
        this.answers.delete(rid);
        this.votes.delete(rid);
        this.rounds.delete(rid);
      }
      for (const p of [...this.players.values()].filter((p) => p.room_id === roomId)) {
        this.players.delete(p.id);
        for (const [tok, pid] of this.playerTokens) if (pid === p.id) this.playerTokens.delete(tok);
      }
      this.rooms.delete(roomId);
    }
    return staleIds;
  }

  async insertPlayer(row: Omit<Player, 'id' | 'joined_at' | 'last_seen_at'>): Promise<Player> {
    const now = new Date().toISOString();
    const player: Player = { ...row, id: randomId(), joined_at: now, last_seen_at: now };
    this.players.set(player.id, player);
    this.playerTokens.set(player.player_token, player.id);
    return player;
  }

  async getPlayerByToken(token: string): Promise<Player | null> {
    const id = this.playerTokens.get(token);
    if (!id) return null;
    return this.players.get(id) ?? null;
  }

  async getPlayerById(id: string): Promise<Player | null> {
    return this.players.get(id) ?? null;
  }

  async listPlayers(roomId: string): Promise<Player[]> {
    return [...this.players.values()]
      .filter((p) => p.room_id === roomId)
      .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
  }

  async updatePlayer(id: string, patch: Partial<Player>): Promise<Player> {
    const existing = this.players.get(id);
    if (!existing) throw new Error(`Player ${id} bestaat niet`);
    const updated = { ...existing, ...patch };
    this.players.set(id, updated);
    return updated;
  }

  async insertRound(row: Omit<Round, 'id' | 'created_at'>): Promise<Round> {
    const round: Round = { ...row, id: randomId(), created_at: new Date().toISOString() };
    this.rounds.set(round.id, round);
    this.assignments.set(round.id, []);
    this.answers.set(round.id, []);
    this.votes.set(round.id, []);
    return round;
  }

  async getRound(id: string): Promise<Round | null> {
    return this.rounds.get(id) ?? null;
  }

  async updateRound(id: string, patch: Partial<Round>): Promise<Round> {
    const existing = this.rounds.get(id);
    if (!existing) throw new Error(`Round ${id} bestaat niet`);
    const updated = { ...existing, ...patch };
    this.rounds.set(id, updated);
    return updated;
  }

  async listRoundsForRoom(roomId: string): Promise<Round[]> {
    return [...this.rounds.values()]
      .filter((r) => r.room_id === roomId)
      .sort((a, b) => a.round_number - b.round_number);
  }

  async insertAssignments(rows: Omit<Assignment, 'id'>[]): Promise<Assignment[]> {
    const created = rows.map((r) => ({ ...r, id: randomId() }));
    for (const a of created) {
      const list = this.assignments.get(a.round_id) ?? [];
      list.push(a);
      this.assignments.set(a.round_id, list);
    }
    return created;
  }

  async listAssignments(roundId: string): Promise<Assignment[]> {
    return this.assignments.get(roundId) ?? [];
  }

  async getAssignmentForPlayer(roundId: string, playerId: string): Promise<Assignment | null> {
    const list = this.assignments.get(roundId) ?? [];
    return list.find((a) => a.player_id === playerId) ?? null;
  }

  async upsertAnswer(input: { round_id: string; player_id: string; text: string }): Promise<Answer> {
    const list = this.answers.get(input.round_id) ?? [];
    const existingIdx = list.findIndex((a) => a.player_id === input.player_id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], text: input.text };
      this.answers.set(input.round_id, list);
      return list[existingIdx];
    }
    const answer: Answer = { ...input, id: randomId(), created_at: new Date().toISOString() };
    list.push(answer);
    this.answers.set(input.round_id, list);
    return answer;
  }

  async listAnswers(roundId: string): Promise<Answer[]> {
    return this.answers.get(roundId) ?? [];
  }

  async upsertVote(input: {
    round_id: string;
    ballot_number: number;
    player_id: string;
    target_player_id: string;
  }): Promise<Vote> {
    const list = this.votes.get(input.round_id) ?? [];
    const existingIdx = list.findIndex(
      (v) => v.player_id === input.player_id && v.ballot_number === input.ballot_number,
    );
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], target_player_id: input.target_player_id };
      this.votes.set(input.round_id, list);
      return list[existingIdx];
    }
    const vote: Vote = { ...input, id: randomId(), created_at: new Date().toISOString() };
    list.push(vote);
    this.votes.set(input.round_id, list);
    return vote;
  }

  async listVotes(roundId: string, ballotNumber: number): Promise<Vote[]> {
    return (this.votes.get(roundId) ?? []).filter((v) => v.ballot_number === ballotNumber);
  }
}

export const makeToken = generateToken;
