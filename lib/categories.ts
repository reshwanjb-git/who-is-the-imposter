/**
 * lib/categories.ts
 *
 * De tien categorieën van het spel, plus de logica voor de "Willekeurig"-stand.
 *
 * Elke categorie draagt zijn eigen beperkingen mee. Die worden letterlijk in de
 * vraaggenerator-prompt geplakt (zie lib/question-prompt.ts). De reden dat ze
 * hier staan en niet in de prompt: ze zijn categorie-eigen, niet algemeen, en
 * je wilt ze kunnen bijstellen zonder de prompt aan te raken.
 */

export type Language = 'nl' | 'en';

export type CategoryId =
  | 'food'
  | 'phone'
  | 'peeves'
  | 'school'
  | 'travel'
  | 'media'
  | 'nightlife'
  | 'whatif'
  | 'money'
  | 'confessions';

/**
 * Er zijn twee soorten vraagparen.
 *
 * 'axis'   — de imposter-vraag is een zichtbare verschuiving van de hoofdvraag
 *            op één as. Voorspelbaar goed, maar de twee vragen zien er verwant
 *            uit; wie ze ooit naast elkaar ziet, doorziet de truc.
 *
 * 'bridge' — twee ogenschijnlijk losse vragen waarvan de antwoordvijvers elkaar
 *            overlappen door een echte verband in de werkelijkheid. Veel beter
 *            verstopt, maar moeilijker betrouwbaar te maken.
 *            Harde eis: de antwoordvijver van de imposter-vraag omvat die van de
 *            hoofdvraag en steekt er buiten uit. Nooit andersom.
 */
export type PairType = 'axis' | 'bridge';

/**
 * De as waarop een as-paar verschuift ten opzichte van de hoofdvraag.
 * Gerangschikt van veilig naar riskant: context heeft de meeste antwoordoverlap,
 * polarity lekt het snelst via kwalificerende antwoorden als "nooit meer".
 */
export type ShiftAxis = 'context' | 'time' | 'degree' | 'person' | 'polarity';

export const AXIS_ORDER: ShiftAxis[] = [
  'context',
  'time',
  'degree',
  'person',
  'polarity',
];

/** Twee op de drie rondes een brugpaar, één op de drie een as-paar. */
export const BRIDGE_RATIO = 2 / 3;

export interface Category {
  id: CategoryId;
  label: Record<Language, string>;
  /** Wat voor antwoord deze categorie hoort uit te lokken. */
  answerType: Record<Language, string>;
  /** Assen die in deze categorie het beste werken, in volgorde van voorkeur. */
  preferredAxes: ShiftAxis[];
  /**
   * Of brugparen in deze categorie te maken zijn. Categorieën waarvan de
   * antwoorden uit een gesloten verzameling komen (What If) hebben geen ruimere
   * vijver om een superset mee te vormen en draaien dus alleen op as-paren.
   */
  supportsBridge: boolean;
  /** Harde categorie-eigen beperkingen, gaan letterlijk mee in de prompt. */
  constraints: Record<Language, string[]>;
  /** Doet mee in de Willekeurig-stand. */
  inRandomPool: boolean;
}

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    label: { nl: 'Eten & drinken', en: 'Food & Drink' },
    answerType: {
      nl: 'de naam van een gerecht, product of drankje (1–3 woorden)',
      en: 'the name of a dish, product or drink (1–3 words)',
    },
    preferredAxes: ['context', 'time', 'degree'],
    supportsBridge: true,
    constraints: { nl: [], en: [] },
    inRandomPool: true,
  },
  {
    id: 'phone',
    label: { nl: 'Online & telefoon', en: 'Online & Phone' },
    answerType: {
      nl: 'de naam van een app, of een plaats/handeling van 1–3 woorden',
      en: 'the name of an app, or a place/action of 1–3 words',
    },
    preferredAxes: ['context', 'time', 'degree'],
    supportsBridge: true,
    constraints: {
      nl: [
        'Gebruik alleen apps die vrijwel iedereen op zijn telefoon heeft. Een vraag die een niche-app uitlokt laat niet de imposter opvallen maar iedereen die die app niet gebruikt.',
      ],
      en: [
        'Only reference apps almost everyone has. A question that invites a niche app makes everyone without that app stand out, not the imposter.',
      ],
    },
    inRandomPool: true,
  },
  {
    id: 'peeves',
    label: { nl: 'Irritaties', en: 'Pet Peeves' },
    answerType: {
      nl: 'een gedrag of situatie, kort omschreven (1–4 woorden)',
      en: 'a behaviour or situation, briefly described (1–4 words)',
    },
    preferredAxes: ['context', 'time'],
    supportsBridge: true,
    constraints: {
      nl: [
        'Houd de irritatie licht en algemeen. Geen irritaties die over een specifiek persoon of over de spelers onderling kunnen gaan.',
      ],
      en: [
        'Keep the annoyance light and general. Nothing that could be read as being about a specific person or about the players themselves.',
      ],
    },
    inRandomPool: true,
  },
  {
    id: 'school',
    label: { nl: 'Vroeger & school', en: 'School Days' },
    answerType: {
      nl: 'een herinnering, voorwerp of gewoonte, kort omschreven (1–4 woorden)',
      en: 'a memory, object or habit, briefly described (1–4 words)',
    },
    preferredAxes: ['time', 'context'],
    supportsBridge: true,
    constraints: {
      nl: [
        'Blijf bij ervaringen die iedereen op school heeft gehad. Geen schoolreizen, clubs, sporten of andere dingen die maar een deel van de groep heeft meegemaakt.',
      ],
      en: [
        'Stick to experiences everyone had at school. No school trips, clubs, sports or anything only part of the group would have done.',
      ],
    },
    inRandomPool: true,
  },
  {
    id: 'travel',
    label: { nl: 'Reizen & plekken', en: 'Travel & Places' },
    answerType: {
      nl: 'de naam van een land, stad, plek of reisvoorwerp (1–2 woorden)',
      en: 'the name of a country, city, place or travel item (1–2 words)',
    },
    preferredAxes: ['context', 'degree'],
    supportsBridge: true,
    constraints: {
      nl: [
        'Formuleer vragen over bestemmingen altijd hypothetisch ("waar zou je..."), nooit als ervaring ("waar ben je..."). Niet iedereen heeft gereisd, en wie dat niet heeft wordt anders de verdachte zonder imposter te zijn.',
      ],
      en: [
        'Always phrase destination questions hypothetically ("where would you..."), never as experience ("where have you..."). Not everyone has travelled, and those who have not would otherwise become the suspect without being the imposter.',
      ],
    },
    inRandomPool: true,
  },
  {
    id: 'media',
    label: { nl: 'Films, series & muziek', en: 'Screen & Sound' },
    answerType: {
      nl: 'een titel, artiest of genre (1–3 woorden)',
      en: 'a title, artist or genre (1–3 words)',
    },
    preferredAxes: ['context', 'time'],
    supportsBridge: true,
    constraints: {
      nl: [
        'Alleen breed bekende titels, artiesten en genres. Niets niche.',
        'Nooit "wat is de beste...". Dat levert discussie over smaak op in plaats van antwoorden om te vergelijken.',
      ],
      en: [
        'Only widely known titles, artists and genres. Nothing niche.',
        'Never "what is the best...". That produces debate about taste instead of answers to compare.',
      ],
    },
    inRandomPool: true,
  },
  {
    id: 'nightlife',
    label: { nl: 'Uitgaan & nachtleven', en: 'Going Out' },
    answerType: {
      nl: 'een plek, handeling of voorwerp (1–3 woorden)',
      en: 'a place, action or object (1–3 words)',
    },
    preferredAxes: ['context', 'time'],
    supportsBridge: true,
    constraints: {
      nl: [
        'Geen vragen die een specifieke locatie, stad of avond veronderstellen. Blijf bij algemeen gedrag.',
        'Geen vragen waarop "ik ga nooit uit" een logisch antwoord is.',
      ],
      en: [
        'No questions that assume a specific venue, city or night. Stick to general behaviour.',
        'No questions where "I never go out" is a logical answer.',
      ],
    },
    inRandomPool: true,
  },
  {
    id: 'whatif',
    label: { nl: 'Hypothetisch & absurd', en: 'What If' },
    answerType: {
      nl: 'één keuze uit een gesloten verzameling: een dier, een kracht, een tijdperk (1–2 woorden)',
      en: 'one choice from a closed set: an animal, a power, an era (1–2 words)',
    },
    preferredAxes: ['degree', 'context'],
    supportsBridge: false,
    constraints: {
      nl: [
        'VERBODEN: vragen die met "waarom" of "hoe" beginnen, of die om uitleg vragen. Die lokken zinnen uit in plaats van woorden en breken de vormgelijkheid.',
        'De vraag moet een keuze uit een gesloten verzameling uitlokken (een dier, een superkracht, een tijdperk, een beroep), nooit een vrij verhaal.',
      ],
      en: [
        'FORBIDDEN: questions starting with "why" or "how", or asking for an explanation. Those invite sentences instead of words and break answer-shape parity.',
        'The question must invite a choice from a closed set (an animal, a superpower, an era, a job), never an open-ended story.',
      ],
    },
    inRandomPool: true,
  },
  {
    id: 'money',
    label: { nl: 'Geld & spullen', en: 'Money & Stuff' },
    answerType: {
      nl: 'de naam van een voorwerp (1–3 woorden)',
      en: 'the name of an object (1–3 words)',
    },
    preferredAxes: ['degree', 'context'],
    supportsBridge: true,
    constraints: {
      nl: [
        'VERBODEN: vragen waarop het antwoord een bedrag, aantal of ander getal is. Getalsantwoorden hebben te weinig spreiding en zijn niet gelijkvormig te houden.',
        'Een bedrag mag wel in de vraag staan als aanleiding, maar nooit in het antwoord.',
      ],
      en: [
        'FORBIDDEN: questions whose answer is an amount, a count or any number. Numeric answers have too little spread and cannot be kept uniform in shape.',
        'An amount may appear in the question as a premise, but never in the answer.',
      ],
    },
    inRandomPool: true,
  },
  {
    id: 'confessions',
    label: { nl: 'Eerlijk & gênant', en: 'Confessions' },
    answerType: {
      nl: 'een gedrag of moment, kort omschreven (1–5 woorden)',
      en: 'a behaviour or moment, briefly described (1–5 words)',
    },
    preferredAxes: ['context', 'time'],
    supportsBridge: true,
    constraints: {
      nl: [
        'Het register is gênant en grappig: kleine leugens, dingen die je stiekem doet, momenten waar je je voor schaamt. NOOIT seks, verslaving, geld tussen vrienden, of iets waar iemand de volgende dag spijt van heeft.',
        'BEIDE vragen moeten in exact hetzelfde bekentenisregister staan. Als de ene vraag onschuldig is en de andere zwaar, krijgt één speler willekeurig de zware vraag en is het spel kapot.',
        'Nooit een vraag die om de naam van een medespeler vraagt.',
      ],
      en: [
        'The register is embarrassing and funny: small lies, things you do secretly, moments you cringe at. NEVER sex, addiction, money between friends, or anything someone would regret the next day.',
        'BOTH questions must sit in exactly the same confession register. If one is innocent and the other heavy, one player randomly gets the heavy one and the game is broken.',
        'Never a question that asks for the name of a fellow player.',
      ],
    },
    inRandomPool: true,
  },
];

export const CATEGORY_IDS: CategoryId[] = CATEGORIES.map((c) => c.id);

export function getCategory(id: CategoryId): Category {
  const found = CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Onbekende categorie: ${id}`);
  return found;
}

export function getCategoryLabel(id: CategoryId, language: Language): string {
  return getCategory(id).label[language];
}

/**
 * Willekeurig-stand: trekt een categorie uit de pool.
 * Enige beperking: nooit twee rondes achter elkaar dezelfde categorie.
 */
export function pickRandomCategory(previous?: CategoryId): CategoryId {
  const pool = CATEGORIES.filter(
    (c) => c.inRandomPool && c.id !== previous,
  ).map((c) => c.id);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Kiest het paartype voor deze ronde. Twee op de drie brugparen, tenzij de
 * categorie ze niet aankan.
 */
export function pickPairType(category: CategoryId): PairType {
  if (!getCategory(category).supportsBridge) return 'axis';
  return Math.random() < BRIDGE_RATIO ? 'bridge' : 'axis';
}
