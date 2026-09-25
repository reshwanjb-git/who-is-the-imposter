import type { VercelRequest, VercelResponse } from '@vercel/node';
import { engine, methodGuard, requireString, sendError } from '../lib/api-helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!methodGuard(req, res, ['POST'])) return;
  try {
    const { code, name, emoji } = req.body ?? {};
    const roomCode = requireString(code, 'Roomcode');
    const playerName = requireString(name, 'Naam');
    const playerEmoji = typeof emoji === 'string' && emoji ? emoji : '🙂';

    const { room, player, token } = await engine().joinRoom({
      code: roomCode,
      name: playerName,
      emoji: playerEmoji,
    });

    res.status(200).json({ code: room.code, token, playerId: player.id });
  } catch (err) {
    sendError(res, err);
  }
}
