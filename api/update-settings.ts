import type { VercelRequest, VercelResponse } from '@vercel/node';
import { engine, methodGuard, parseCategorySetting, requireString, sendError } from '../lib/api-helpers';
import type { CategorySetting } from '../lib/types';
import type { Language } from '../lib/categories';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!methodGuard(req, res, ['POST'])) return;
  try {
    const { token, language, category } = req.body ?? {};
    const t = requireString(token, 'token');
    const patch: { language?: Language; category?: CategorySetting } = {};
    if (language === 'nl' || language === 'en') patch.language = language;
    if (typeof category === 'string' && category) patch.category = parseCategorySetting(category);
    await engine().updateSettings(t, patch);
    res.status(200).json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
}
