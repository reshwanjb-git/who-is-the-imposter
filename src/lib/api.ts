import type { CategorySetting, ClientState, GameError } from '@lib/types';
import type { Language } from '@lib/categories';

export class ApiError extends Error {
  code: GameError['code'] | 'network_error';
  constructor(code: GameError['code'] | 'network_error', message: string) {
    super(message);
    this.code = code;
  }
}

async function call<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('network_error', 'Geen verbinding. Controleer je internet en probeer opnieuw.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.error ?? { code: 'validation_error', message: 'Er ging iets mis.' };
    throw new ApiError(err.code, err.message);
  }
  return body as T;
}

function post<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  return call<T>(path, { method: 'POST', body: JSON.stringify(payload) });
}

export interface JoinResult {
  code: string;
  token: string;
  playerId: string;
}

export const api = {
  createRoom: (input: { name: string; emoji: string; language: Language; category: CategorySetting }) =>
    post<JoinResult>('create-room', input),

  joinRoom: (input: { code: string; name: string; emoji: string }) => post<JoinResult>('join', input),

  reconnect: (token: string) => post<{ code: string }>('reconnect', { token }),

  leave: (token: string) => post<{ ok: true }>('leave', { token }),

  getState: (token: string) => call<ClientState>(`state?token=${encodeURIComponent(token)}`),

  startRound: (token: string) => post<{ ok: true }>('start-round', { token }),

  submitAnswer: (token: string, text: string) => post<{ ok: true }>('answer', { token, text }),

  readyNext: (token: string) => post<{ ok: true }>('ready-next', { token }),

  startVoting: (token: string) => post<{ ok: true }>('start-voting', { token }),

  submitVote: (token: string, targetPlayerId: string) => post<{ ok: true }>('vote', { token, targetPlayerId }),

  forceAdvance: (token: string) => post<{ ok: true }>('force-advance', { token }),

  kick: (token: string, targetPlayerId: string) => post<{ ok: true }>('kick', { token, targetPlayerId }),

  transferHost: (token: string, targetPlayerId: string) =>
    post<{ ok: true }>('transfer-host', { token, targetPlayerId }),

  updateSettings: (token: string, patch: { language?: Language; category?: CategorySetting }) =>
    post<{ ok: true }>('update-settings', { token, ...patch }),

  explain: (token: string, word: string) => post<{ ok: boolean; text: string }>('explain', { token, word }),
};
