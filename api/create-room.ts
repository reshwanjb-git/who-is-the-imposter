import type { VercelRequest, VercelResponse } from '@vercel/node';
import { engine, methodGuard, parseCategorySetting, requireString, sendError } from '../lib/api-helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!methodGuard(req, res, ['POST'])) return;
  try {
    const { name, emoji, language, category } = req.body ?? {};
    const hostName = requireString(name, 'Naam');
    const hostEmoji = typeof emoji === 'string' && emoji ? emoji : '🙂';
    const lang = language === 'en' ? 'en' : 'nl';
    const cat = parseCategorySetting(category);

    const { room, player, token } = await engine().createRoom({
      hostName,
      hostEmoji,
      language: lang,
      category: cat,
    });

    res.status(200).json({
      code: room.code,
      token,
      playerId: player.id,
    });
  } catch (err) {
    sendError(res, err);
  }
}
