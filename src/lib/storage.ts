/**
 * Bewaart player_token + roomcode in localStorage zodat je terugkomt in
 * dezelfde room na het sluiten van Safari of het verlies van verbinding.
 * Elke lees/schrijf zit in try/catch: localStorage kan ontbreken of
 * geblokkeerd zijn (privénavigatie, restrictieve instellingen).
 */

const KEY = 'imposter:session';

export interface StoredSession {
  code: string;
  token: string;
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.code === 'string' && typeof parsed?.token === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // negeren — speler kan nog steeds spelen, alleen geen herverbinden na herladen
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // negeren
  }
}

const MUTE_KEY = 'imposter:muted';

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // negeren
  }
}
