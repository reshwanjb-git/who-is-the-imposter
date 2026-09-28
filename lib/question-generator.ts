/**
 * lib/question-generator.ts
 *
 * Verbindt lib/question-prompt.ts (de prompt-bouwer) met de Gemini API, met
 * een garantie: deze functie faalt NOOIT. Als er geen key is, de call mislukt,
 * of het antwoord geen geldige JSON is, valt hij terug op
 * lib/fallback-questions.ts. De app is dus altijd speelbaar.
 */

import { buildQuestionPrompt, parseQuestionPair } from './question-prompt';
import { pickFallbackPairForCategory } from './fallback-questions';
import { pickRandomCategory, type CategoryId, type Language } from './categories';

export interface GeneratedQuestion {
  category: CategoryId;
  main_question: string;
  imposter_question: string;
  /** 'ai' of 'fallback:<id>' — opgeslagen in rounds.used_by_all_pair_key om herhaling te voorkomen. */
  source_key: string;
}

// Zie https://ai.google.dev/gemini-api/docs/models voor de actuele modellijst.
// Overschrijf via GEMINI_MODEL in de Vercel env vars als dit model ooit vervangen wordt.
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

export async function generateQuestionPair(opts: {
  language: Language;
  category: CategoryId | 'random';
  usedMainQuestions: string[];
  usedFallbackKeys: string[];
  playerCount: number;
  previousCategory?: CategoryId | null;
}): Promise<GeneratedQuestion> {
  const resolvedCategory: CategoryId =
    opts.category === 'random' ? pickRandomCategory(opts.previousCategory ?? undefined) : opts.category;

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = buildQuestionPrompt({
        language: opts.language,
        category: resolvedCategory,
        usedQuestions: opts.usedMainQuestions,
        playerCount: opts.playerCount,
      });

      const { GoogleGenAI } = await import('@google/genai');
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        contents: prompt,
      });

      const text = response.text ?? '';

      const pair = parseQuestionPair(text);

      return {
        category: resolvedCategory,
        main_question: pair.main_question,
        imposter_question: pair.imposter_question,
        source_key: 'ai',
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[generateQuestionPair] AI-aanroep mislukt, val terug op fallback:', err);
    }
  }

  const usedFallbackIds = opts.usedFallbackKeys
    .filter((k) => k.startsWith('fallback:'))
    .map((k) => k.slice('fallback:'.length));

  const fallback = pickFallbackPairForCategory(resolvedCategory, usedFallbackIds);

  return {
    category: fallback.category,
    main_question: fallback.main[opts.language],
    imposter_question: fallback.imposter[opts.language],
    source_key: `fallback:${fallback.id}`,
  };
}
