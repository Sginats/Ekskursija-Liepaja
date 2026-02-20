/**
 * CoopData
 *
 * Configuration for all cooperative game mechanics:
 *   - Dual-key validation locations
 *   - Global loot pool items
 *   - Flash quiz questions
 */

// ── Dual-key locations ────────────────────────────────────────────────────────
// At these locations one player ("questioner") sees the question normally,
// while their partner ("clue_holder") receives a set of targeted clues they
// must communicate verbally to help answer.
//
// If no partner is available the location falls back to single-player mode.

/** @type {Record<string, { hint: string, clues: string[] }>} */
export const DUAL_KEY_LOCATIONS = {
  rtu: {
    hint: 'Dibināšanas gads',
    clues: [
      'Iestāde dibināta pēc Otrā pasaules kara.',
      'Gads beidzas ar ciparu "4".',
      'Tas ir piecdesmitajos gados.',
      'Konkrēti — 1954. gads.',
    ],
  },
  cietums: {
    hint: 'Celšanas gads',
    clues: [
      'Cietums celts cara Krievijas laikā.',
      'Tas ir gadsimta mijā — ap 1900. gadu.',
      'Precīzi — pats gadsimta sākums.',
      'Gads ir 1900.',
    ],
  },
};

// ── Global loot pool ──────────────────────────────────────────────────────────
// Items are "found" at one location and can be "used" at another for a bonus.
// The server tracks which items are currently in the shared pool.

/**
 * @typedef {Object} LootItem
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {string} foundAt      – locationId where this item spawns
 * @property {string} usedAt       – locationId where using it gives a bonus
 * @property {string} description
 * @property {number} bonusPoints  – extra points awarded on use
 */

/** @type {Record<string, LootItem>} */
export const LOOT_ITEMS = {
  port_pass: {
    id:          'port_pass',
    name:        'Ostas Caurlaide',
    emoji:       '🎫',
    foundAt:     'osta',
    usedAt:      'lsez',
    description: 'Iegūta ostā — atver LSEZ papildinformāciju.',
    bonusPoints: 5,
  },
  canal_key: {
    id:          'canal_key',
    name:        'Kanāla Atslēga',
    emoji:       '🗝️',
    foundAt:     'kanals',
    usedAt:      'osta',
    description: 'Iegūta kanālā — palīdz ostas uzdevumā.',
    bonusPoints: 5,
  },
  concert_note: {
    id:          'concert_note',
    name:        'Mūzikas Nots',
    emoji:       '🎵',
    foundAt:     'dzintars',
    usedAt:      'teatris',
    description: 'Iegūta Lielajā Dzintarā — dod mājienu teātra jautājumam.',
    bonusPoints: 5,
  },
  lighthouse_map: {
    id:          'lighthouse_map',
    name:        'Bākas Karte',
    emoji:       '🗺️',
    foundAt:     'mols',
    usedAt:      'ezerkrasts',
    description: 'Iegūta molā — palīdz orientēties ezerkrastā.',
    bonusPoints: 5,
  },
};

// Reverse lookup: usedAt → LootItem
export const LOOT_BY_USE = Object.fromEntries(
  Object.values(LOOT_ITEMS).map(item => [item.usedAt, item])
);

// ── Flash quiz questions ──────────────────────────────────────────────────────
// Activated server-side when ≥ 3 players are online.
// Correct answers contribute to the global community score.

/**
 * @typedef {Object} FlashQuestion
 * @property {string}   id
 * @property {string}   question
 * @property {string[]} options   – 4 choices
 * @property {string}   answer    – must match one of options exactly
 * @property {string}   fact
 * @property {number}   communityPoints – added to globalProgress on majority correct
 */

/** @type {FlashQuestion[]} */
export const FLASH_QUIZ_QUESTIONS = [
  {
    id:              'fq_symbol',
    question:        'Kāds ir Liepājas neoficiālais simbols?',
    options:         ['Dzintars', 'Vējš', 'Jūra', 'Roze'],
    answer:          'Vējš',
    fact:            'Liepāja saukta par "Vēju pilsētu" — tā ir viena no vējainākajām pilsētām Latvijā.',
    communityPoints: 3,
  },
  {
    id:              'fq_year',
    question:        'Kurā gadā Liepāja ieguva pilsētas tiesības?',
    options:         ['1595', '1625', '1655', '1700'],
    answer:          '1625',
    fact:            'Liepāja pilsētas tiesības ieguva 1625. gadā no Kurzemes hercoga Frīdriha.',
    communityPoints: 3,
  },
  {
    id:              'fq_festival',
    question:        'Kā sauc Liepājas populāro mūzikas festivālu?',
    options:         ['Positivus', 'Laima Rendezvous', 'Liepājas Dzintars', 'Rīgas Ritmi'],
    answer:          'Laima Rendezvous',
    fact:            'Laima Rendezvous ir gadskārtējs starptautisks latviešu estrādes mūzikas festivāls Liepājā.',
    communityPoints: 3,
  },
  {
    id:              'fq_population',
    question:        'Cik iedzīvotāju ir Liepājā (aptuveni)?',
    options:         ['40 000', '60 000', '80 000', '100 000'],
    answer:          '60 000',
    fact:            'Liepāja ar aptuveni 60 000 iedzīvotājiem ir trešā lielākā pilsēta Latvijā.',
    communityPoints: 3,
  },
  {
    id:              'fq_karosta',
    question:        'Kā sauc bijušo militāro kvartālu Liepājas ziemeļos?',
    options:         ['Karadarbības zona', 'Karosta', 'Militārā bāze', 'Ziemeļu rajons'],
    answer:          'Karosta',
    fact:            'Karosta celts 19. gs. beigās kā Krievijas cara jūras kara flotes bāze.',
    communityPoints: 3,
  },
];

// ── Co-op scoring constants ───────────────────────────────────────────────────
export const COOP_MULTIPLIER       = 1.2;   // applied when both players at same location
export const COOP_PENALTY_POINTS   = 3;     // deducted from each player on coop fail
export const FLASH_QUIZ_PLAYER_MIN = 3;     // minimum players online to trigger flash quiz
export const FLASH_QUIZ_TIME_LIMIT = 20;    // seconds per question
