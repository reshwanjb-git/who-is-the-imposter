import type { VercelRequest, VercelResponse } from '@vercel/node';
import { engine, methodGuard, parseCategorySetting, requireString, sendError } from '../lib/api-helpers.js';
import type { CategorySetting } from '../lib/types.js';
import type { Language } from '../lib/categories.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!methodGuard(req, res, ['POST'])) return;
  try {
    const { action, ...rest } = (req.body ?? {}) as Record<string, unknown> & { action?: unknown };
    const body = rest as Record<string, unknown>;

    switch (action) {
      case 'create-room': {
        const { name, emoji, language, category } = body;
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
        res.status(200).json({ code: room.code, token, playerId: player.id });
        return;
      }
      case 'join': {
        const { code, name, emoji } = body;
        const roomCode = requireString(code, 'Roomcode');
        const playerName = requireString(name, 'Naam');
        const playerEmoji = typeof emoji === 'string' && emoji ? emoji : '🙂';
        const { room, player, token } = await engine().joinRoom({
          code: roomCode,
          name: playerName,
          emoji: playerEmoji,
        });
        res.status(200).json({ code: room.code, token, playerId: player.id });
        return;
      }
      case 'reconnect': {
        const t = requireString(body.token, 'token');
        const { room } = await engine().reconnect(t);
        res.status(200).json({ code: room.code });
        return;
      }
      case 'leave': {
        const t = requireString(body.token, 'token');
        await engine().leaveRoom(t);
        res.status(200).json({ ok: true });
        return;
      }
      case 'start-round': {
        const t = requireString(body.token, 'token');
        await engine().startRound(t);
        res.status(200).json({ ok: true });
        return;
      }
      case 'answer': {
        const t = requireString(body.token, 'token');
        const answerText = requireString(body.text, 'Antwoord');
        await engine().submitAnswer(t, answerText);
        res.status(200).json({ ok: true });
        return;
      }
      case 'ready-next': {
        const t = requireString(body.token, 'token');
        await engine().readyForAnswers(t);
        res.status(200).json({ ok: true });
        return;
      }
      case 'start-voting': {
        const t = requireString(body.token, 'token');
        await engine().startVoting(t);
        res.status(200).json({ ok: true });
        return;
      }
      case 'vote': {
        const t = requireString(body.token, 'token');
        const target = requireString(body.targetPlayerId, 'targetPlayerId');
        await engine().submitVote(t, target);
        res.status(200).json({ ok: true });
        return;
      }
      case 'force-advance': {
        const t = requireString(body.token, 'token');
        await engine().forceAdvance(t);
        res.status(200).json({ ok: true });
        return;
      }
      case 'kick': {
        const t = requireString(body.token, 'token');
        const target = requireString(body.targetPlayerId, 'targetPlayerId');
        await engine().kickPlayer(t, target);
        res.status(200).json({ ok: true });
        return;
      }
      case 'transfer-host': {
        const t = requireString(body.token, 'token');
        const target = requireString(body.targetPlayerId, 'targetPlayerId');
        await engine().transferHost(t, target);
        res.status(200).json({ ok: true });
        return;
      }
      case 'update-settings': {
        const t = requireString(body.token, 'token');
        const patch: { language?: Language; category?: CategorySetting } = {};
        if (body.language === 'nl' || body.language === 'en') patch.language = body.language;
        if (typeof body.category === 'string' && body.category) patch.category = parseCategorySetting(body.category);
        await engine().updateSettings(t, patch);
        res.status(200).json({ ok: true });
        return;
      }
      case 'explain': {
        const t = requireString(body.token, 'token');
        const w = requireString(body.word, 'word');
        const result = await engine().explainWord(t, w);
        res.status(200).json(result);
        return;
      }
      default:
        res.status(400).json({ error: { code: 'validation_error', message: 'Onbekende actie.' } });
    }
  } catch (err) {
    sendError(res, err);
  }
}
