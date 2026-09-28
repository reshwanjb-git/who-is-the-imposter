import type { VercelRequest, VercelResponse } from '@vercel/node';
import { engine } from '../lib/api-helpers.js';

/**
 * Wordt elk uur aangeroepen door de Vercel Cron job in vercel.json.
 * Vercel Cron stuurt zelf een geheime "Authorization: Bearer <CRON_SECRET>"
 * header mee als je CRON_SECRET instelt in de env vars — dat controleren we
 * hier zodat niemand anders deze route kan misbruiken.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: { code: 'invalid_token', message: 'Niet toegestaan.' } });
      return;
    }
  }
  try {
    const removed = await engine().cleanupStaleRooms();
    res.status(200).json({ removed: removed.length });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: { code: 'internal_error', message: 'Cleanup mislukt.' } });
  }
}
