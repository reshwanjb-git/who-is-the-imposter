import { GameEngine } from '../lib/game-engine';
import { MemoryStore } from '../lib/memory-store';
import type { CategorySetting } from '../lib/types';
import type { Language } from '../lib/categories';

export interface TestPlayer {
  name: string;
  token: string;
  id: string;
}

export async function setupRoom(
  playerNames: string[],
  opts: { language?: Language; category?: CategorySetting } = {},
): Promise<{ engine: GameEngine; store: MemoryStore; code: string; players: TestPlayer[] }> {
  const store = new MemoryStore();
  const engine = new GameEngine(store);

  const [hostName, ...restNames] = playerNames;
  const host = await engine.createRoom({
    hostName,
    hostEmoji: '🦊',
    language: opts.language ?? 'nl',
    category: opts.category ?? 'random',
  });

  const players: TestPlayer[] = [{ name: hostName, token: host.token, id: host.player.id }];

  for (const name of restNames) {
    const joined = await engine.joinRoom({ code: host.room.code, name, emoji: '🐸' });
    players.push({ name, token: joined.token, id: joined.player.id });
  }

  return { engine, store, code: host.room.code, players };
}

export async function findImposter(
  store: MemoryStore,
  roomCode: string,
  players: TestPlayer[],
): Promise<TestPlayer> {
  const room = await store.getRoomByCode(roomCode);
  if (!room?.current_round_id) throw new Error('Geen actieve ronde');
  const round = await store.getRound(room.current_round_id);
  if (!round) throw new Error('Ronde niet gevonden');
  const imposter = players.find((p) => p.id === round.imposter_player_id);
  if (!imposter) throw new Error('Imposter niet gevonden in players[]');
  return imposter;
}
