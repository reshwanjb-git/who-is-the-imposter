/**
 * lib/supabase-admin.ts
 *
 * Server-only Supabase-client met de service_role key. Wordt UITSLUITEND
 * geïmporteerd binnen /api/* (Vercel serverless functions) — nooit vanuit
 * src/ (de browser-bundel). De service_role key omzeilt RLS volledig, dus
 * hij mag nooit met VITE_-prefix in de client terechtkomen.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY moeten gezet zijn in de Vercel env vars (zie .env.example).',
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
