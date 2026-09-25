/**
 * lib/explain-prompt.ts
 *
 * De "Woord niet duidelijk?"-knop onder het antwoordveld.
 *
 * BELANGRIJK — dit is een veiligheidsgrens, geen stijlkeuze:
 * deze aanroep mag NOOIT de vraag van de speler te zien krijgen. Als een speler
 * zijn hele vraag kon intypen, zou de uitleg het verschil tussen de hoofdvraag
 * en de imposter-vraag kunnen verraden — en zou de imposter kunnen afleiden dat
 * hij de imposter is. Daarom:
 *
 *   - invoer is beperkt tot maximaal drie woorden
 *   - de prompt bevat geen enkele spelcontext
 *   - het antwoord is één korte zin, zonder voorbeeldzin
 *
 * Verder ziet niemand anders in de kamer dat een speler de knop gebruikt. Als de
 * groep dat wél zou zien, wordt het gebruik van de knop zelf een aanwijzing.
 */

import { Language } from './categories';

export const MAX_EXPLAIN_WORDS = 3;

export interface ExplainPromptInput {
  /** Het woord dat de speler niet begrijpt. Maximaal drie woorden. */
  word: string;
  /** Taal van de kamer. Het antwoord komt in dezelfde taal. */
  language: Language;
}

export type ExplainValidation =
  | { ok: true; word: string }
  | { ok: false; reason: 'empty' | 'too_long'; message: Record<Language, string> };

/**
 * Valideert de invoer vóór de API-aanroep. Weigert alles wat op een hele vraag
 * lijkt in plaats van een los woord.
 */
export function validateExplainInput(raw: string): ExplainValidation {
  const word = raw.trim().replace(/\s+/g, ' ');

  if (!word) {
    return {
      ok: false,
      reason: 'empty',
      message: {
        nl: 'Vul een woord in.',
        en: 'Enter a word.',
      },
    };
  }

  if (word.split(' ').length > MAX_EXPLAIN_WORDS) {
    return {
      ok: false,
      reason: 'too_long',
      message: {
        nl: 'Vul alleen het woord in dat je niet begrijpt, niet de hele vraag.',
        en: 'Enter just the word you do not understand, not the whole question.',
      },
    };
  }

  return { ok: true, word };
}

export function buildExplainPrompt(input: ExplainPromptInput): string {
  const { word, language } = input;
  const languageName = language === 'nl' ? 'Dutch' : 'English';

  return `Explain what a word means, in ${languageName}.

Word: ${word}

RULES
- Answer with ONE short sentence, at most 15 words.
- Write in simple, everyday ${languageName} that a 15-year-old would understand.
- Give the plain meaning only. No example sentence, no etymology, no synonyms list.
- Do not ask a follow-up question and do not add any commentary.
- If the input is not a word you can explain, answer only: ${
    language === 'nl'
      ? 'Dit woord ken ik niet.'
      : 'I do not know this word.'
  }

Return only the sentence, with no quotation marks and no markdown.`;
}

/** Knipt het modelantwoord terug tot één zin, voor het geval het uitweidt. */
export function parseExplanation(raw: string): string {
  const text = raw
    .trim()
    .replace(/^```(?:\w+)?/i, '')
    .replace(/```$/, '')
    .replace(/^["']|["']$/g, '')
    .trim();

  const firstSentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return firstSentence.trim();
}

/** Labels voor de knop en het invoerveld. */
export const EXPLAIN_UI_TEXT: Record<
  Language,
  { button: string; placeholder: string; loading: string; error: string }
> = {
  nl: {
    button: 'Woord niet duidelijk?',
    placeholder: 'Typ het woord',
    loading: 'Even kijken…',
    error: 'Uitleg lukte niet. Probeer het nog eens.',
  },
  en: {
    button: 'Word unclear?',
    placeholder: 'Type the word',
    loading: 'One moment…',
    error: 'Could not explain that. Try again.',
  },
};
