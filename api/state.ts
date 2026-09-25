import type { VercelRequest, VercelResponse } from '@vercel/node';
import { engine, methodGuard, requireString, sendError } from '../lib/api-helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!methodGuard(req, res, ['GET'])) return;
  try {
    const token = requireString(req.query.token, 'token');
    const state = await engine().getClientState(token);
    res.status(200).json(state);
  } catch (err) {
    sendError(res, err);
  }
}
