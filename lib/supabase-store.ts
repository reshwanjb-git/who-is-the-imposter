/**
 * lib/supabase-store.ts
 *
 * Productie-implementatie van de Store-interface (zie lib/store.ts), boven op
 * Supabase met de service_role key. Wordt alleen binnen /api/* gebruikt.
 * Cascade-deletes (rooms → rounds → assignments/answers/votes, players) staan
 * in supabase/schema.sql, dus deleteStaleRooms hoeft alleen de rooms zelf te
 * verwijderen.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Store } from './store';
import type { Answer, Assignment, Player, Room, Round, Vote } from './types';
import { makeToken } from './token';

export class SupabaseStore implements Store {
  constructor(private db: SupabaseClient) {}

  async insertRoom(row: Omit<Room, 'id' | 'created_at' | 'last_active_at'>): Promise<Room> {
    const { data, error } = await this.db.from('rooms').insert(row).select().single();
    if (error) throw error;
    return data as Room;
  }

  async getRoomByCode(code: string): Promise<Room | null> {
    const { data, error } = await this.db.from('rooms').select('*').eq('code', code).maybeSingle();
    if (error) throw error;
    return (data as Room) ?? null;
  }

  async getRoomById(id: string): Promise<Room | null> {
    const { data, error } = await this.db.from('rooms').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Room) ?? null;
  }

  async updateRoom(id: string, patch: Partial<Room>): Promise<Room> {
    const { data, error } = await this.db.from('rooms').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data as Room;
  }

  async deleteStaleRooms(olderThanMs: number): Promise<string[]> {
    const cutoff = new Date(Date.now() - olderThanMs).toISOString();
    const { data: stale, error: selectError } = await this.db
      .from('rooms')
      .select('id')
      .lt('last_active_at', cutoff);
    if (selectError) throw selectError;
    const ids = (stale ?? []).map((r: { id: string }) => r.id);
    if (ids.length === 0) return [];
    const { error: deleteError } = await this.db.from('rooms').delete().in('id', ids);
    if (deleteError) throw deleteError;
    return ids;
  }

  async insertPlayer(row: Omit<Player, 'id' | 'joined_at' | 'last_seen_at'>): Promise<Player> {
    const insertRow = { ...row, player_token: row.player_token || makeToken() };
    const { data, error } = await this.db.from('players').insert(insertRow).select().single();
    if (error) throw error;
    return data as Player;
  }

  async getPlayerByToken(token: string): Promise<Player | null> {
    const { data, error } = await this.db.from('players').select('*').eq('player_token', token).maybeSingle();
    if (error) throw error;
    return (data as Player) ?? null;
  }

  async getPlayerById(id: string): Promise<Player | null> {
    const { data, error } = await this.db.from('players').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Player) ?? null;
  }

  async listPlayers(roomId: string): Promise<Player[]> {
    const { data, error } = await this.db
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Player[];
  }

  async updatePlayer(id: string, patch: Partial<Player>): Promise<Player> {
    const { data, error } = await this.db.from('players').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data as Player;
  }

  async insertRound(row: Omit<Round, 'id' | 'created_at'>): Promise<Round> {
    const { data, error } = await this.db.from('rounds').insert(row).select().single();
    if (error) throw error;
    return data as Round;
  }

  async getRound(id: string): Promise<Round | null> {
    const { data, error } = await this.db.from('rounds').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Round) ?? null;
  }

  async updateRound(id: string, patch: Partial<Round>): Promise<Round> {
    const { data, error } = await this.db.from('rounds').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data as Round;
  }

  async listRoundsForRoom(roomId: string): Promise<Round[]> {
    const { data, error } = await this.db
      .from('rounds')
      .select('*')
      .eq('room_id', roomId)
      .order('round_number', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Round[];
  }

  async insertAssignments(rows: Omit<Assignment, 'id'>[]): Promise<Assignment[]> {
    const { data, error } = await this.db.from('assignments').insert(rows).select();
    if (error) throw error;
    return (data ?? []) as Assignment[];
  }

  async listAssignments(roundId: string): Promise<Assignment[]> {
    const { data, error } = await this.db.from('assignments').select('*').eq('round_id', roundId);
    if (error) throw error;
    return (data ?? []) as Assignment[];
  }

  async getAssignmentForPlayer(roundId: string, playerId: string): Promise<Assignment | null> {
    const { data, error } = await this.db
      .from('assignments')
      .select('*')
      .eq('round_id', roundId)
      .eq('player_id', playerId)
      .maybeSingle();
    if (error) throw error;
    return (data as Assignment) ?? null;
  }

  async upsertAnswer(input: { round_id: string; player_id: string; text: string }): Promise<Answer> {
    const { data, error } = await this.db
      .from('answers')
      .upsert(input, { onConflict: 'round_id,player_id' })
      .select()
      .single();
    if (error) throw error;
    return data as Answer;
  }

  async listAnswers(roundId: string): Promise<Answer[]> {
    const { data, error } = await this.db.from('answers').select('*').eq('round_id', roundId);
    if (error) throw error;
    return (data ?? []) as Answer[];
  }

  async upsertVote(input: {
    round_id: string;
    ballot_number: number;
    player_id: string;
    target_player_id: string;
  }): Promise<Vote> {
    const { data, error } = await this.db
      .from('votes')
      .upsert(input, { onConflict: 'round_id,ballot_number,player_id' })
      .select()
      .single();
    if (error) throw error;
    return data as Vote;
  }

  async listVotes(roundId: string, ballotNumber: number): Promise<Vote[]> {
    const { data, error } = await this.db
      .from('votes')
      .select('*')
      .eq('round_id', roundId)
      .eq('ballot_number', ballotNumber);
    if (error) throw error;
    return (data ?? []) as Vote[];
  }
}
