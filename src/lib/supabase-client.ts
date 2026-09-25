/**
 * Browser-Supabase-client met de PUBLIEKE anon key. Wordt uitsluitend
 * gebruikt om te luisteren op realtime-wijzigingen van rooms.state_version
 * (zie supabase/schema.sql — anon mag verder niets lezen). Alle echte
 * data komt via /api/state met de speler-token.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    client = null; // Nog niet geconfigureerd — app valt terug op pollen alleen.
    return client;
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
