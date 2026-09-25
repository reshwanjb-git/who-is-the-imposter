import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GameEngine } from './game-engine';
import { SupabaseStore } from './supabase-store';
import { getSupabaseAdmin } from './supabase-admin';
import { GameEngineError, type CategorySetting, type GameError } from './types';
import { CATEGORY_IDS } from './categories';

export function engine(): GameEngine {
  return new GameEngine(new SupabaseStore(getSupabaseAdmin()));
}

function statusForCode(code: GameError['code']): number {
  switch (code) {
    case 'room_not_found':
      return 404;
    case 'invalid_token':
      return 401;
    case 'not_host':
      return 403;
    case 'room_full':
    case 'wrong_phase':
    case 'round_broken_too_few_players':
    case 'already_answered':
    case 'already_voted':
      return 409;
    case 'name_required':
    case 'validation_error':
    default:
      return 400;
  }
}

export function sendError(res: VercelResponse, err: unknown): void {
  if (err instanceof GameEngineError) {
    res.status(statusForCode(err.code)).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Er ging iets mis. Probeer het opnieuw.' } });
}

export function methodGuard(req: VercelRequest, res: VercelResponse, allowed: string[]): boolean {
  if (!allowed.includes(req.method || '')) {
    res.setHeader('Allow', allowed.join(', '));
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Methode niet toegestaan.' } });
    return false;
  }
  return true;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new GameEngineError('validation_error', `${field} is verplicht.`);
  }
  return value;
}

/** Valideert een categorie-string tegen de bekende categorieën, of 'random'. */
export function parseCategorySetting(value: unknown): CategorySetting {
  if (value === 'random') return 'random';
  if (typeof value === 'string' && (CATEGORY_IDS as string[]).includes(value)) {
    return value as CategorySetting;
  }
  return 'random';
}
