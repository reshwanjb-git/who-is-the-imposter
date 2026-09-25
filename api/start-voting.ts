import type { VercelRequest, VercelResponse } from '@vercel/node';
import { engine, methodGuard, requireString, sendError } from '../lib/api-helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!methodGuard(req, res, ['POST'])) return;
  try {
    const { token } = req.body ?? {};
    const t = requireString(token, 'token');
    await engine().startVoting(t);
    res.status(200).json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
}
