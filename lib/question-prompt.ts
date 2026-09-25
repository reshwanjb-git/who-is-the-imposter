/**
 * lib/question-prompt.ts
 *
 * Bouwt de prompt die per ronde één vraagpaar genereert.
 *
 * Het model krijgt uitsluitend dit terug te geven, zonder inleiding, uitleg of
 * markdown-backticks:
 *
 *   { "category": "...", "main_question": "...", "imposter_question": "..." }
 *
 * De regels hieronder zijn de neerslag van een trainingssessie. De volgorde is
 * niet willekeurig: regel 0 is het enige echte criterium, de rest bestaat om te
 * voorkomen dat je regel 0 per ongeluk mist.
 */

import {
  Category,
  CategoryId,
  Language,
  PairType,
  ShiftAxis,
  getCategory,
  pickPairType,
} from './categories';

export interface QuestionPromptInput {
  /** Taal van de kamer. Bepaalt de taal van de vragen én van de voorbeelden. */
  language: Language;
  /** Categorie voor deze ronde. */
  category: CategoryId;
  /** Hoofdvragen die al gebruikt zijn in deze kamer. Mogen niet terugkomen. */
  usedQuestions: string[];
  /** Aantal spelers in de kamer (3–10). Bepaalt hoe groot de verschuiving mag zijn. */
  playerCount: number;
  /** Optioneel: dwing een paartype af. Zonder dit wordt er geloot (2 op 3 brug). */
  pairType?: PairType;
}

/** Het verwachte antwoord van het model. */
export interface QuestionPair {
  category: string;
  main_question: string;
  imposter_question: string;
}

interface ExamplePair {
  category: CategoryId;
  type: PairType;
  /** Alleen bij as-paren. */
  axis?: ShiftAxis;
  main: Record<Language, string>;
  imposter: Record<Language, string>;
  /** Het antwoord dat bij beide vragen past en de imposter dekt. */
  camouflage: Record<Language, string>;
  /** Alleen bij brugparen: een antwoord uit de staart dat de imposter verraadt. */
  tell?: Record<Language, string>;
}

/* -------------------------------------------------------------------------- */
/* Goedgekeurde voorbeeldparen                                                 */
/* -------------------------------------------------------------------------- */

const EXAMPLES: ExamplePair[] = [
  /* ---------------------------- BRUGPAREN ---------------------------------- */
  {
    category: 'food',
    type: 'bridge',
    main: {
      nl: 'Wat staat er altijd in je koelkast?',
      en: 'What do you keep in the fridge at all times?',
    },
    imposter: {
      nl: 'Wat vergeet je altijd in de supermarkt?',
      en: 'What do you always forget at the grocery store?',
    },
    camouflage: { nl: 'eieren', en: 'eggs' },
    tell: { nl: 'tandpasta', en: 'toothpaste' },
  },
  {
    category: 'food',
    type: 'bridge',
    main: {
      nl: 'Wat eet je bijna elke dag?',
      en: 'What do you eat almost every day?',
    },
    imposter: {
      nl: 'Wat staat er altijd op je boodschappenlijst?',
      en: 'What is always on your shopping list?',
    },
    camouflage: { nl: 'yoghurt', en: 'yoghurt' },
    tell: { nl: 'wc-papier', en: 'toilet paper' },
  },
  {
    category: 'phone',
    type: 'bridge',
    main: {
      nl: 'Welke app staat op je beginscherm?',
      en: 'Which app is on your home screen?',
    },
    imposter: {
      nl: 'Van welke app kreeg je als laatste een melding?',
      en: 'Which app sent you your last notification?',
    },
    camouflage: { nl: 'Spotify', en: 'Spotify' },
    tell: { nl: 'mijn bank-app', en: 'my banking app' },
  },
  {
    category: 'travel',
    type: 'bridge',
    main: {
      nl: 'Wat neem je altijd mee op vakantie?',
      en: 'What do you always take on holiday?',
    },
    imposter: {
      nl: 'Wat koop je altijd nog snel op het vliegveld?',
      en: 'What do you always end up buying at the airport?',
    },
    camouflage: { nl: 'oplader', en: 'charger' },
    tell: { nl: 'tijdschrift', en: 'magazine' },
  },
  {
    category: 'nightlife',
    type: 'bridge',
    main: {
      nl: 'Wat neem je mee als je uitgaat?',
      en: 'What do you take with you when you go out?',
    },
    imposter: {
      nl: 'Wat ben je wel eens kwijtgeraakt op een avond uit?',
      en: 'What have you lost on a night out?',
    },
    camouflage: { nl: 'pinpas', en: 'bank card' },
    tell: { nl: 'mijn jas', en: 'my jacket' },
  },
  {
    category: 'money',
    type: 'bridge',
    main: {
      nl: 'Wat ligt er altijd op je nachtkastje?',
      en: 'What is always on your bedside table?',
    },
    imposter: {
      nl: 'Wat zoek je altijd als je wakker wordt?',
      en: 'What are you always looking for when you wake up?',
    },
    camouflage: { nl: 'oplader', en: 'charger' },
    tell: { nl: 'mijn sokken', en: 'my socks' },
  },
  {
    category: 'school',
    type: 'bridge',
    main: {
      nl: 'Wat had je altijd in je etui?',
      en: 'What did you always have in your pencil case?',
    },
    imposter: {
      nl: 'Wat leende je altijd van iemand anders?',
      en: 'What did you always borrow from someone else?',
    },
    camouflage: { nl: 'gum', en: 'eraser' },
    tell: { nl: 'geld', en: 'money' },
  },
  {
    category: 'peeves',
    type: 'bridge',
    main: {
      nl: 'Waar erger je je aan in huis?',
      en: 'What annoys you around the house?',
    },
    imposter: {
      nl: 'Wat ruim je altijd als laatste op?',
      en: 'What do you always clean up last?',
    },
    camouflage: { nl: 'de afwas', en: 'the dishes' },
    tell: { nl: 'stofzuigen', en: 'vacuuming' },
  },
  {
    category: 'confessions',
    type: 'bridge',
    main: {
      nl: 'Wat doe je als er niemand thuis is?',
      en: 'What do you do when nobody else is home?',
    },
    imposter: {
      nl: 'Wat zou je niet willen dat iemand ziet?',
      en: 'What would you not want anyone to see?',
    },
    camouflage: { nl: 'hardop meezingen', en: 'singing out loud' },
    tell: { nl: 'mijn zoekgeschiedenis', en: 'my search history' },
  },

  /* ----------------------------- AS-PAREN ---------------------------------- */
  {
    category: 'food',
    type: 'axis',
    axis: 'degree',
    main: {
      nl: 'Wat is het duurste dat je ooit hebt gegeten?',
      en: 'What is the most expensive thing you have ever eaten?',
    },
    imposter: {
      nl: 'Wat is het vreemdste dat je ooit hebt gegeten?',
      en: 'What is the strangest thing you have ever eaten?',
    },
    camouflage: { nl: 'oesters', en: 'oysters' },
  },
  {
    category: 'food',
    type: 'axis',
    axis: 'context',
    main: {
      nl: 'Wat bestel je als je eten laat bezorgen?',
      en: 'What do you order when you get food delivered?',
    },
    imposter: {
      nl: 'Wat bestel je als je uit eten gaat?',
      en: 'What do you order when you eat out?',
    },
    camouflage: { nl: 'sushi', en: 'sushi' },
  },
  {
    category: 'phone',
    type: 'axis',
    axis: 'context',
    main: {
      nl: 'Welke app open je als je je verveelt?',
      en: 'Which app do you open when you are bored?',
    },
    imposter: {
      nl: "Welke app open je 's ochtends als eerste?",
      en: 'Which app do you open first in the morning?',
    },
    camouflage: { nl: 'Instagram', en: 'Instagram' },
  },
  {
    category: 'phone',
    type: 'axis',
    axis: 'time',
    main: {
      nl: 'Welke app gebruikte je vroeger het meest?',
      en: 'Which app did you use most back in the day?',
    },
    imposter: {
      nl: 'Welke app gebruik je nu het meest?',
      en: 'Which app do you use most now?',
    },
    camouflage: { nl: 'Instagram', en: 'Instagram' },
  },
  {
    category: 'school',
    type: 'axis',
    axis: 'time',
    main: {
      nl: 'Wat deed je in de pauze op de basisschool?',
      en: 'What did you do during break in primary school?',
    },
    imposter: {
      nl: 'Wat deed je in de pauze op de middelbare school?',
      en: 'What did you do during break in secondary school?',
    },
    camouflage: { nl: 'kletsen', en: 'chatting' },
  },
  {
    category: 'media',
    type: 'axis',
    axis: 'context',
    main: {
      nl: 'Welke serie kijk je als je niets kunt kiezen?',
      en: 'Which show do you put on when you cannot choose anything?',
    },
    imposter: {
      nl: 'Welke serie kijk je als je ziek bent?',
      en: 'Which show do you watch when you are ill?',
    },
    camouflage: { nl: 'Friends', en: 'Friends' },
  },
  {
    category: 'whatif',
    type: 'axis',
    axis: 'degree',
    main: {
      nl: 'Welk dier zou je zelf willen zijn?',
      en: 'Which animal would you want to be?',
    },
    imposter: {
      nl: 'Welk dier zou je als huisdier willen?',
      en: 'Which animal would you want as a pet?',
    },
    camouflage: { nl: 'aap', en: 'monkey' },
  },
  {
    category: 'travel',
    type: 'axis',
    axis: 'context',
    main: {
      nl: 'Naar welk land zou je morgen willen vertrekken?',
      en: 'Which country would you leave for tomorrow?',
    },
    imposter: {
      nl: 'In welk land zou je willen wonen?',
      en: 'Which country would you want to live in?',
    },
    camouflage: { nl: 'Italië', en: 'Italy' },
  },
];

/* -------------------------------------------------------------------------- */
/* Promptopbouw                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Voorbeelden van het gevraagde type: eerst uit de eigen categorie, daarna
 * aanvullen uit andere categorieën. Twee voorbeelden van het andere type gaan
 * altijd mee als contrast, zodat het model het verschil ziet.
 */
function selectExamples(category: CategoryId, type: PairType): ExamplePair[] {
  const sameType = EXAMPLES.filter((e) => e.type === type);
  const own = sameType.filter((e) => e.category === category);
  const others = sameType
    .filter((e) => e.category !== category)
    .sort(() => Math.random() - 0.5);

  const primary = [...own, ...others].slice(0, 6);
  const contrast = EXAMPLES.filter((e) => e.type !== type)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  return [...primary, ...contrast];
}

function renderExample(e: ExamplePair, language: Language, index: number): string {
  const head =
    e.type === 'bridge'
      ? `${index}. type: BRIDGE`
      : `${index}. type: AXIS (${e.axis})`;

  const tell = e.tell
    ? `\n   tell (tail answer that exposes the imposter): ${e.tell[language]}`
    : '';

  return (
    `${head}\n` +
    `   main_question: ${e.main[language]}\n` +
    `   imposter_question: ${e.imposter[language]}\n` +
    `   camouflage answer: ${e.camouflage[language]}${tell}`
  );
}

function difficultyGuidance(playerCount: number): string {
  if (playerCount <= 4) {
    return (
      `There are only ${playerCount} players, so there are just ${playerCount - 1} ` +
      `ordinary answers on screen. That is barely a band to hide in. Keep the two answer ` +
      `pools CLOSE together, and make sure the camouflage answer is one at least half the ` +
      `group might plausibly give.`
    );
  }
  if (playerCount <= 7) {
    return (
      `There are ${playerCount} players. Use a normal distance: close enough that the ` +
      `imposter's answer is defensible, far enough that it raises an eyebrow.`
    );
  }
  return (
    `There are ${playerCount} players, so the ordinary answers will spread out naturally and ` +
    `give the imposter plenty of cover. You may push the two pools slightly FURTHER apart than ` +
    `usual, otherwise the round becomes an unwinnable guess.`
  );
}

function pairTypeInstructions(type: PairType): string {
  if (type === 'bridge') {
    return `PAIR TYPE FOR THIS ROUND: BRIDGE

A bridge pair is two questions that look completely unrelated, but whose answer pools overlap
because of a real-world connection between them. Example: "What do you keep in the fridge at all
times?" and "What do you always forget at the grocery store?" — you forget the things you always
need, and you always need the things you keep stocked. Milk, eggs and butter sit in both pools.

This is the strongest pair type, because the imposter reads a perfectly normal standalone question
and has no reason to suspect anything. Build it like this:

- Rule 19 (DIRECTION, non-negotiable): the answer pool of the IMPOSTER question must CONTAIN the
  answer pool of the main question and extend beyond it. Shopping list ⊃ fridge contents. Lost items
  ⊃ items you bring. Never the other way round: if the imposter's pool sits inside the main pool,
  every imposter answer fits the main question and the imposter is undetectable by design.
- Rule 20 (TAIL): the part of the imposter pool that sticks out should contain answers that are
  IMPOSSIBLE as answers to the main question, not merely unlikely. Toothpaste is never in a fridge.
  That gives a crisp, funny reveal instead of a vague "hmm, unusual".
- Rule 18 (HIDDEN KINSHIP): read the two questions side by side. If they look like obvious siblings
  of one another, you have written an axis pair by accident. Rewrite.`;
  }

  return `PAIR TYPE FOR THIS ROUND: AXIS

An axis pair keeps the subject intact and shifts exactly ONE dimension of the question.

- Rule 12: shift on exactly one axis. In order of preference: context > time > degree > person >
  polarity. Two shifts stack two signals, and two signals is always one too many. Polarity leaks
  fastest through rule 6, so avoid it unless nothing else works.
- The two answer pools should be roughly the same size and overlap in their core, while their
  tails diverge.`;
}

export function buildQuestionPrompt(input: QuestionPromptInput): string {
  const { language, category, usedQuestions, playerCount } = input;
  const cat: Category = getCategory(category);
  const type: PairType = input.pairType ?? pickPairType(category);
  const examples = selectExamples(category, type);

  const languageName = language === 'nl' ? 'Dutch' : 'English';

  const categoryConstraints = cat.constraints[language].length
    ? cat.constraints[language].map((c) => `- ${c}`).join('\n')
    : '- (no category-specific constraints)';

  const used = usedQuestions.length
    ? usedQuestions.map((q) => `- ${q}`).join('\n')
    : '- (none yet)';

  const bridgeChecks =
    type === 'bridge'
      ? `h. Is the imposter question's answer pool a proper superset of the main question's pool?
   Name one answer that sits in the imposter pool but is IMPOSSIBLE for the main question. If you
   cannot name one, the pair fails rule 19 and 20. Rewrite it.
i. Read both questions side by side. Do they look like obvious variations of one another? If yes,
   they fail rule 18. Rewrite.`
      : `h. Confirm you shifted exactly ONE axis, and name it. If you shifted two, rewrite.`;

  return `You generate question pairs for a party game called "Who is the Imposter".

HOW THE GAME WORKS
Every player receives the same question, except one — the imposter — who receives a different
question. The imposter DOES NOT KNOW they are the imposter; they answer honestly, believing they got
the normal question. Everyone types a short answer. Then the main question appears on screen together
with every player's answer and name, all at once. The group discusses freely and then votes on who
they think got the different question.

Because the imposter does not know, they cannot adapt their answer, match the tone, or add noise.
ALL of the camouflage has to come from the question pair itself. This is the entire craft.

THE ONE CRITERION (rule 0)
Placed next to the revealed main question, the imposter's likely answer must produce the reaction:
"that's possible, but who would actually say that?"
- If the reaction is "that's impossible" → too far apart. The imposter is dead instantly.
- If the reaction is "sure, obviously" → too close. There is nothing to discuss.

${pairTypeInstructions(type)}

LAYER 1 — SHAPE RULES (what the eye catches in one second, before meaning registers)
1. Same answer type. Both questions must invite the same kind of answer: both a place, both a
   number, both a name, both an object.
2. Same granularity. Country against country, never country against city.
3. Same length. Both questions must invite roughly the same number of words.
4. Same grammatical shape. A noun against a noun. Avoid "why" and "how" questions in pairs —
   they invite sentences, which will never match one-word answers.

LAYER 2 — CONTENT RULES
5. Spread on the main question. Six random people must give at least four different answers to it.
   The ordinary answers form the visible band the imposter hides inside; a narrow band means no
   cover at all. Questions whose answer is a number almost always fail this rule.
6. No leaking phrasings. Avoid "never", "no longer", "least", "except". A qualified answer such as
   "Zandvoort, never again" reconstructs the imposter question on screen and ends the round in
   two seconds.
7. A defence sentence must exist. Write, for yourself, the one sentence with which the imposter
   could justify their answer against the main question during the discussion. If you cannot do it
   in one sentence, the questions are too far apart.
8. Answerable by everyone. Could the poorest, most stay-at-home, youngest person in the group give
   a sensible answer within five seconds? If not, that person becomes the suspect without being the
   imposter.
9. Not publicly verifiable. No shared history, no facts. The group must interpret, not fact-check.
10. Ten-second rule. No calculating, looking up or digging through memory.
11. Survives translation. The pair must work identically in Dutch and English. No idioms, no wordplay.
16. Everyday language only. Every word must be understood by anyone, including someone who is not a
    native speaker. No dialect, no dated words, no slang, no jargon. Test: would a 15-year-old, or
    someone two years into learning the language, understand this immediately? An unknown word
    breaks rule 8 and rule 10 at the same time.
17. The camouflage must exist. There must be at least one obvious answer that fits BOTH questions —
    that is the imposter's cover.
21. The camouflage must not be the imposter's most likely answer. If the shared answer is the single
    most probable answer to the IMPOSTER question, the imposter will simply type it by chance, there
    will be no deviation on screen, and the vote becomes a coin flip. The camouflage should sit in
    the MIDDLE of the imposter question's likelihood list, not at the top — common enough to cover
    them when they land on it, rare enough that they usually do not.

LAYER 3 — CALIBRATION
13. Equal emotional weight and social risk. Never a pair where one side gives a safe answer and the
    other a confession. Never a question that invites the name of a fellow player.
14. The imposter question must sound natural on its own. Read in isolation, it should be believable
    as this round's normal question.
15. Difficulty scales with player count. ${difficultyGuidance(playerCount)}

TARGET DIFFICULTY
On a 1–5 scale where 1 = imposter unfindable and 5 = obvious at a glance, aim for a 2, occasionally
a 3. Because there is a free discussion before the vote, every pair effectively moves up one point
in play. Err on the hard side.

THIS ROUND
Language: ${languageName}. Write BOTH questions in ${languageName}, using natural, everyday
${languageName} — not a translation of the examples.
Category: ${cat.label[language]}
Expected answer type: ${cat.answerType[language]}
Player count: ${playerCount}

CATEGORY-SPECIFIC CONSTRAINTS (these override general preferences)
${categoryConstraints}

ALREADY USED IN THIS ROOM — do not repeat these, and do not produce a rephrasing of them.
Also vary your approach: do not reuse the same construction as the most recent pairs below.
${used}

APPROVED EXAMPLES
${examples.map((e, i) => renderExample(e, language, i + 1)).join('\n\n')}

SELF-CHECK BEFORE YOU ANSWER
Run these silently. If any fails, rewrite the pair and check again.
a. Name the five most likely answers to the main question, and the five most likely to the imposter
   question. At least two must appear in both lists.
b. Is the imposter's typical answer a valid answer to the main question, but one that would not make
   the top three? If not, adjust.
c. Name the single most likely answer to the IMPOSTER question. If that is the same as your
   camouflage answer, the pair fails rule 21. Rewrite it.
d. Would six random people give at least four different answers to the main question?
e. Write the defence sentence. Does it work in one sentence?
f. Do both questions invite the same word count and the same grammatical shape?
g. Does every word pass rule 16?
${bridgeChecks}

OUTPUT
Return ONLY this JSON object. No introduction, no explanation, no markdown backticks, no code
fences, nothing before or after it. The "category" field must be exactly: ${cat.label[language]}

{"category": "${cat.label[language]}", "main_question": "...", "imposter_question": "..."}`;
}

/* -------------------------------------------------------------------------- */
/* Antwoordverwerking                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Parseert het antwoord van het model. Vangt de twee dingen op die in de
 * praktijk misgaan: markdown-fences eromheen, en tekst voor of na de JSON.
 */
export function parseQuestionPair(raw: string): QuestionPair {
  let text = raw.trim();

  text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Geen JSON gevonden in modelantwoord: ${raw.slice(0, 200)}`);
  }

  const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<QuestionPair>;

  if (!parsed.main_question || !parsed.imposter_question || !parsed.category) {
    throw new Error(`Onvolledig vraagpaar: ${text.slice(0, 200)}`);
  }
  if (parsed.main_question.trim() === parsed.imposter_question.trim()) {
    throw new Error('Hoofdvraag en imposter-vraag zijn identiek.');
  }

  return {
    category: parsed.category.trim(),
    main_question: parsed.main_question.trim(),
    imposter_question: parsed.imposter_question.trim(),
  };
}
