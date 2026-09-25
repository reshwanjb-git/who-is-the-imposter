import type { VercelRequest, VercelResponse } from '@vercel/node';
import { engine, methodGuard, requireString, sendError } from '../lib/api-helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!methodGuard(req, res, ['POST'])) return;
  try {
    const { token, word } = req.body ?? {};
    const t = requireString(token, 'token');
    const w = requireString(word, 'word');
    const result = await engine().explainWord(t, w);
    res.status(200).json(result);
  } catch (err) {
    sendError(res, err);
  }
}
