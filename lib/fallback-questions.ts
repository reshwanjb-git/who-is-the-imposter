/**
 * lib/fallback-questions.ts
 *
 * 25 handgemaakte vraagparen, gebruikt wanneer:
 *  - er nog geen GEMINI_API_KEY is ingesteld,
 *  - de API-call faalt, of
 *  - het model ongeldige/onvolledige JSON teruggeeft.
 *
 * De app moet hierdoor volledig speelbaar zijn zonder API-key. Elk paar is
 * getoetst aan dezelfde regels als de generator-prompt (lib/question-prompt.ts):
 * gelijke vormgelijkheid, spreiding, camouflage-antwoord aanwezig, geen
 * lekkende bewoordingen, alledaags taalgebruik.
 *
 * Herhaal binnen dezelfde room geen paar zolang er nog ongebruikte over zijn
 * (zie pickFallbackPair in de game-engine).
 */

import type { CategoryId, Language } from './categories.js';

export interface FallbackPair {
  id: string;
  category: CategoryId;
  main: Record<Language, string>;
  imposter: Record<Language, string>;
}

export const FALLBACK_QUESTIONS: FallbackPair[] = [
  {
    id: 'fb-01',
    category: 'food',
    main: { nl: 'Wat staat er altijd in je koelkast?', en: 'What do you keep in the fridge at all times?' },
    imposter: { nl: 'Wat vergeet je altijd in de supermarkt?', en: 'What do you always forget at the grocery store?' },
  },
  {
    id: 'fb-02',
    category: 'food',
    main: { nl: 'Wat bestel je als je eten laat bezorgen?', en: 'What do you order when you get food delivered?' },
    imposter: { nl: 'Wat bestel je als je uit eten gaat?', en: 'What do you order when you eat out?' },
  },
  {
    id: 'fb-03',
    category: 'food',
    main: { nl: 'Wat eet je bijna elke dag?', en: 'What do you eat almost every day?' },
    imposter: { nl: 'Wat staat er altijd op je boodschappenlijst?', en: 'What is always on your shopping list?' },
  },
  {
    id: 'fb-04',
    category: 'food',
    main: { nl: 'Wat is het duurste dat je ooit hebt gegeten?', en: 'What is the most expensive thing you have ever eaten?' },
    imposter: { nl: 'Wat is het vreemdste dat je ooit hebt gegeten?', en: 'What is the strangest thing you have ever eaten?' },
  },
  {
    id: 'fb-05',
    category: 'phone',
    main: { nl: 'Welke app staat op je beginscherm?', en: 'Which app is on your home screen?' },
    imposter: { nl: 'Van welke app kreeg je als laatste een melding?', en: 'Which app sent you your last notification?' },
  },
  {
    id: 'fb-06',
    category: 'phone',
    main: { nl: 'Welke app open je als je je verveelt?', en: 'Which app do you open when you are bored?' },
    imposter: { nl: "Welke app open je 's ochtends als eerste?", en: 'Which app do you open first in the morning?' },
  },
  {
    id: 'fb-07',
    category: 'phone',
    main: { nl: 'Welke app gebruikte je vroeger het meest?', en: 'Which app did you use most back in the day?' },
    imposter: { nl: 'Welke app gebruik je nu het meest?', en: 'Which app do you use most now?' },
  },
  {
    id: 'fb-08',
    category: 'peeves',
    main: { nl: 'Waar erger je je aan in huis?', en: 'What annoys you around the house?' },
    imposter: { nl: 'Wat ruim je altijd als laatste op?', en: 'What do you always clean up last?' },
  },
  {
    id: 'fb-09',
    category: 'peeves',
    main: { nl: 'Waar erger je je aan in het verkeer?', en: 'What annoys you in traffic?' },
    imposter: { nl: 'Waar erger je je aan in een wachtrij?', en: 'What annoys you while waiting in line?' },
  },
  {
    id: 'fb-10',
    category: 'school',
    main: { nl: 'Wat had je altijd in je etui?', en: 'What did you always have in your pencil case?' },
    imposter: { nl: 'Wat leende je altijd van iemand anders?', en: 'What did you always borrow from someone else?' },
  },
  {
    id: 'fb-11',
    category: 'school',
    main: { nl: 'Wat deed je in de pauze op de basisschool?', en: 'What did you do during break in primary school?' },
    imposter: { nl: 'Wat deed je in de pauze op de middelbare school?', en: 'What did you do during break in secondary school?' },
  },
  {
    id: 'fb-12',
    category: 'travel',
    main: { nl: 'Wat neem je altijd mee op vakantie?', en: 'What do you always take on holiday?' },
    imposter: { nl: 'Wat koop je altijd nog snel op het vliegveld?', en: 'What do you always end up buying at the airport?' },
  },
  {
    id: 'fb-13',
    category: 'travel',
    main: { nl: 'Naar welk land zou je morgen willen vertrekken?', en: 'Which country would you leave for tomorrow?' },
    imposter: { nl: 'In welk land zou je willen wonen?', en: 'Which country would you want to live in?' },
  },
  {
    id: 'fb-14',
    category: 'media',
    main: { nl: 'Welke serie kijk je als je niets kunt kiezen?', en: 'Which show do you put on when you cannot choose anything?' },
    imposter: { nl: 'Welke serie kijk je als je ziek bent?', en: 'Which show do you watch when you are ill?' },
  },
  {
    id: 'fb-15',
    category: 'media',
    main: { nl: 'Welk nummer zet je op als je moet opschieten?', en: 'Which song do you put on when you need energy?' },
    imposter: { nl: 'Welk nummer zet je op als je gaat slapen?', en: 'Which song do you put on before falling asleep?' },
  },
  {
    id: 'fb-16',
    category: 'nightlife',
    main: { nl: 'Wat neem je mee als je uitgaat?', en: 'What do you take with you when you go out?' },
    imposter: { nl: 'Wat ben je wel eens kwijtgeraakt op een avond uit?', en: 'What have you lost on a night out?' },
  },
  {
    id: 'fb-17',
    category: 'nightlife',
    main: { nl: 'Wat drink je als je uitgaat?', en: 'What do you drink when you go out?' },
    imposter: { nl: 'Wat drink je op een rustige avond thuis?', en: 'What do you drink on a quiet night at home?' },
  },
  {
    id: 'fb-18',
    category: 'whatif',
    main: { nl: 'Welk dier zou je zelf willen zijn?', en: 'Which animal would you want to be?' },
    imposter: { nl: 'Welk dier zou je als huisdier willen?', en: 'Which animal would you want as a pet?' },
  },
  {
    id: 'fb-19',
    category: 'whatif',
    main: { nl: 'In welk tijdperk zou je geboren willen zijn?', en: 'Which era would you want to be born in?' },
    imposter: { nl: 'In welk tijdperk zou je een dag willen doorbrengen?', en: 'Which era would you want to spend one day in?' },
  },
  {
    id: 'fb-20',
    category: 'money',
    main: { nl: 'Wat ligt er altijd op je nachtkastje?', en: 'What is always on your bedside table?' },
    imposter: { nl: 'Wat zoek je altijd als je wakker wordt?', en: 'What are you always looking for when you wake up?' },
  },
  {
    id: 'fb-21',
    category: 'money',
    main: { nl: 'Wat ligt er altijd in je jaszak?', en: 'What is always in your jacket pocket?' },
    imposter: { nl: 'Wat controleer je altijd voor je de deur uitgaat?', en: 'What do you always check before leaving the house?' },
  },
  {
    id: 'fb-22',
    category: 'confessions',
    main: { nl: 'Wat doe je als er niemand thuis is?', en: 'What do you do when nobody else is home?' },
    imposter: { nl: 'Wat zou je niet willen dat iemand ziet?', en: 'What would you not want anyone to see?' },
  },
  {
    id: 'fb-23',
    category: 'confessions',
    main: { nl: 'Waar praat je in het echt tegen als je alleen bent?', en: 'What do you talk to out loud when you are alone?' },
    imposter: { nl: 'Waarover lieg je in het klein tegen vrienden?', en: 'What small lie do you tell friends?' },
  },
  {
    id: 'fb-24',
    category: 'food',
    main: { nl: 'Wat zou je nooit van je bord laten liggen?', en: 'What would you never leave on your plate?' },
    imposter: { nl: 'Waar maak je altijd extra van klaar?', en: 'What do you always make extra of?' },
  },
  {
    id: 'fb-25',
    category: 'school',
    main: { nl: 'Welk vak vond je op school het makkelijkst?', en: 'Which subject did you find easiest at school?' },
    imposter: { nl: 'Welk vak vond je op school het nuttigst?', en: 'Which subject did you find most useful at school?' },
  },
];

/**
 * Kiest een ongebruikt fallback-paar. `usedPairIds` bevat de id's die deze
 * room al gebruikt heeft. Zodra alle 25 op zijn, wordt de lijst gereset
 * (herbruikt) — beter dan de room laten vastlopen.
 */
export function pickFallbackPair(usedPairIds: string[]): FallbackPair {
  const unused = FALLBACK_QUESTIONS.filter((p) => !usedPairIds.includes(p.id));
  const pool = unused.length > 0 ? unused : FALLBACK_QUESTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickFallbackPairForCategory(
  category: CategoryId,
  usedPairIds: string[],
): FallbackPair {
  const inCategory = FALLBACK_QUESTIONS.filter((p) => p.category === category);
  const candidates = inCategory.length > 0 ? inCategory : FALLBACK_QUESTIONS;
  const unused = candidates.filter((p) => !usedPairIds.includes(p.id));
  const pool = unused.length > 0 ? unused : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}
