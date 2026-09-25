import { useCallback, useEffect, useState } from 'react';
import type { ClientState } from '@lib/types';
import { api, ApiError } from '@/lib/api';
import { getSupabaseClient } from '@/lib/supabase-client';

const POLL_MS = 2000;

export interface GameStateHook {
  state: ClientState | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Haalt gepersonaliseerde state op via /api/state, en houdt die vers met:
 *   1. Een fallback-poll van 2 seconden (werkt altijd, ook als realtime
 *      wegvalt — bv. op iOS als het scherm even uitgaat).
 *   2. Een realtime-subscription op rooms.state_version (als
 *      VITE_SUPABASE_URL/ANON_KEY zijn ingesteld) voor snellere updates.
 */
export function useGameState(token: string | null): GameStateHook {
  const [state, setState] = useState<ClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!token) return;
    try {
      const next = await api.getState(token);
      setState(next);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Onbekende fout.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fallback-poll: werkt altijd, los van realtime.
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchState();
    const interval = window.setInterval(fetchState, POLL_MS);
    return () => window.clearInterval(interval);
  }, [token, fetchState]);

  // Realtime: zodra we de roomcode kennen, luisteren op rooms.state_version
  // voor die specifieke room (zie supabase/schema.sql — anon mag alleen
  // code/phase/state_version lezen). Snellere updates dan de 2s-poll,
  // die blijft als vangnet draaien (bv. voor iOS-achtergrondtabs).
  const code = state?.room.code ?? null;
  useEffect(() => {
    if (!token || !code) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`room-${code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        () => {
          fetchState();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token, code, fetchState]);

  return { state, loading, error, refresh: fetchState };
}
