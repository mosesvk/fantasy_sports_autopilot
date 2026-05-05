/**
 * Static NFL content for the Rankings tab (standings, league grid, demo playoff bracket).
 * Season stats reflect demo / UI reference data when live standings APIs are not wired.
 */

/** @typedef {{ status?: string, abbr: string, w: number, l: number, t?: number, pct: number, home: string, away: string, div: string, conf: string, pf: number, pa: number, strk: string }} StandingsRow */

/** @typedef {{ seed: number, abbr: string, score?: number | null }} BracketTeam */

/** @typedef {{ home: BracketTeam, away: BracketTeam, winner: "home" | "away", status?: string }} BracketGame */

/** @typedef {{ seed: number, abbr: string }} BracketBye */

export const CHAMPIONSHIP_HISTORY = [
  { season: 2025, champion: "Buffalo Bills", runnerUp: "San Francisco 49ers", championAbbr: "BUF", runnerUpAbbr: "SF" },
  { season: 2024, champion: "Kansas City Chiefs", runnerUp: "Philadelphia Eagles", championAbbr: "KC", runnerUpAbbr: "PHI" },
  { season: 2023, champion: "Kansas City Chiefs", runnerUp: "San Francisco 49ers", championAbbr: "KC", runnerUpAbbr: "SF" },
  { season: 2022, champion: "Kansas City Chiefs", runnerUp: "Philadelphia Eagles", championAbbr: "KC", runnerUpAbbr: "PHI" },
  { season: 2021, champion: "Los Angeles Rams", runnerUp: "Cincinnati Bengals", championAbbr: "LAR", runnerUpAbbr: "CIN" },
  { season: 2020, champion: "Tampa Bay Buccaneers", runnerUp: "Kansas City Chiefs", championAbbr: "TB", runnerUpAbbr: "KC" },
];

/** Full name by abbreviation for standings / bracket labels. */
export const TEAM_NAMES = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs",
  LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams",
  LV: "Las Vegas Raiders",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WSH: "Washington Commanders",
};

/** League overview: divisions and team abbreviations (NFL alignment). */
export const NFL_DIVISIONS_GRID = [
  {
    conference: "AFC",
    divisions: [
      { label: "AFC East", teams: ["BUF", "MIA", "NE", "NYJ"] },
      { label: "AFC North", teams: ["BAL", "CIN", "CLE", "PIT"] },
      { label: "AFC South", teams: ["HOU", "IND", "JAX", "TEN"] },
      { label: "AFC West", teams: ["DEN", "KC", "LV", "LAC"] },
    ],
  },
  {
    conference: "NFC",
    divisions: [
      { label: "NFC East", teams: ["DAL", "NYG", "PHI", "WSH"] },
      { label: "NFC North", teams: ["CHI", "DET", "GB", "MIN"] },
      { label: "NFC South", teams: ["ATL", "CAR", "NO", "TB"] },
      { label: "NFC West", teams: ["ARI", "LAR", "SF", "SEA"] },
    ],
  },
];

/** Demo 2025 division standings (subset aligned with reference screenshots). */
export const STANDINGS_BY_DIVISION_2025 = {
  AFC: {
    "AFC EAST": [
      { status: "z", abbr: "NE", w: 14, l: 3, t: 0, pct: 0.824, home: "8-1", away: "6-2", div: "5-1", conf: "10-2", pf: 482, pa: 312, strk: "W3" },
      { status: "y", abbr: "BUF", w: 12, l: 5, t: 0, pct: 0.706, home: "7-2", away: "5-3", div: "4-2", conf: "8-4", pf: 441, pa: 355, strk: "W1" },
      { status: "e", abbr: "MIA", w: 7, l: 10, t: 0, pct: 0.412, home: "4-5", away: "3-5", div: "2-4", conf: "5-7", pf: 368, pa: 402, strk: "L2" },
      { status: "e", abbr: "NYJ", w: 4, l: 13, t: 0, pct: 0.235, home: "2-6", away: "2-7", div: "1-5", conf: "3-9", pf: 298, pa: 411, strk: "L1" },
    ],
    "AFC NORTH": [
      { status: "z", abbr: "PIT", w: 10, l: 7, t: 0, pct: 0.588, home: "6-3", away: "4-4", div: "4-2", conf: "7-5", pf: 362, pa: 339, strk: "W2" },
      { status: "y", abbr: "BAL", w: 9, l: 8, t: 0, pct: 0.529, home: "5-4", away: "4-4", div: "3-3", conf: "6-6", pf: 398, pa: 371, strk: "L1" },
      { status: "e", abbr: "CIN", w: 6, l: 11, t: 0, pct: 0.353, home: "3-6", away: "3-5", div: "2-4", conf: "4-8", pf: 351, pa: 410, strk: "L3" },
      { status: "e", abbr: "CLE", w: 5, l: 12, t: 0, pct: 0.294, home: "3-5", away: "2-7", div: "1-5", conf: "4-8", pf: 318, pa: 395, strk: "W1" },
    ],
    "AFC SOUTH": [
      { status: "z", abbr: "JAX", w: 13, l: 4, t: 0, pct: 0.765, home: "7-2", away: "6-2", div: "5-1", conf: "9-3", pf: 428, pa: 331, strk: "W4" },
      { status: "y", abbr: "IND", w: 10, l: 7, t: 0, pct: 0.588, home: "6-3", away: "4-4", div: "4-2", conf: "7-5", pf: 405, pa: 388, strk: "W1" },
      { status: "e", abbr: "HOU", w: 8, l: 9, t: 0, pct: 0.471, home: "5-4", away: "3-5", div: "2-4", conf: "5-7", pf: 379, pa: 401, strk: "L1" },
      { status: "e", abbr: "TEN", w: 3, l: 14, t: 0, pct: 0.176, home: "2-6", away: "1-8", div: "1-5", conf: "2-10", pf: 289, pa: 445, strk: "L5" },
    ],
    "AFC WEST": [
      { status: "*", abbr: "DEN", w: 14, l: 3, t: 0, pct: 0.824, home: "8-1", away: "6-2", div: "5-1", conf: "10-2", pf: 468, pa: 298, strk: "W2" },
      { status: "y", abbr: "KC", w: 12, l: 5, t: 0, pct: 0.706, home: "7-2", away: "5-3", div: "4-2", conf: "9-3", pf: 452, pa: 329, strk: "W1" },
      { status: "e", abbr: "LAC", w: 8, l: 9, t: 0, pct: 0.471, home: "4-5", away: "4-4", div: "2-4", conf: "5-7", pf: 391, pa: 368, strk: "L2" },
      { status: "e", abbr: "LV", w: 6, l: 11, t: 0, pct: 0.353, home: "4-5", away: "2-6", div: "1-5", conf: "4-8", pf: 336, pa: 413, strk: "L1" },
    ],
  },
  NFC: {
    "NFC EAST": [
      { status: "z", abbr: "PHI", w: 11, l: 6, t: 0, pct: 0.647, home: "6-3", away: "5-3", div: "4-2", conf: "8-4", pf: 431, pa: 377, strk: "L1" },
      { status: "e", abbr: "DAL", w: 7, l: 9, t: 1, pct: 0.441, home: "4-4", away: "3-5-1", div: "2-4", conf: "5-7", pf: 389, pa: 429, strk: "L1" },
      { status: "e", abbr: "WSH", w: 5, l: 12, t: 0, pct: 0.294, home: "3-5", away: "2-7", div: "2-4", conf: "4-8", pf: 342, pa: 437, strk: "L2" },
      { status: "e", abbr: "NYG", w: 4, l: 13, t: 0, pct: 0.235, home: "2-6", away: "2-7", div: "2-4", conf: "3-9", pf: 318, pa: 376, strk: "W1" },
    ],
    "NFC NORTH": [
      { status: "z", abbr: "CHI", w: 11, l: 6, t: 0, pct: 0.647, home: "6-3", away: "5-3", div: "4-2", conf: "8-4", pf: 412, pa: 386, strk: "W1" },
      { status: "y", abbr: "GB", w: 9, l: 7, t: 1, pct: 0.559, home: "5-3-1", away: "4-4", div: "3-2-1", conf: "7-5", pf: 401, pa: 370, strk: "W2" },
      { status: "e", abbr: "MIN", w: 9, l: 8, t: 0, pct: 0.529, home: "5-4", away: "4-4", div: "3-3", conf: "6-6", pf: 398, pa: 387, strk: "W1" },
      { status: "e", abbr: "DET", w: 9, l: 8, t: 0, pct: 0.529, home: "5-4", away: "4-4", div: "2-4", conf: "6-6", pf: 445, pa: 377, strk: "W7" },
    ],
    "NFC SOUTH": [
      { status: "z", abbr: "CAR", w: 8, l: 9, t: 0, pct: 0.471, home: "5-4", away: "3-5", div: "4-2", conf: "6-6", pf: 348, pa: 417, strk: "L1" },
      { status: "e", abbr: "TB", w: 8, l: 9, t: 0, pct: 0.471, home: "4-5", away: "4-4", div: "3-3", conf: "5-7", pf: 392, pa: 423, strk: "W1" },
      { status: "e", abbr: "ATL", w: 8, l: 9, t: 0, pct: 0.471, home: "4-5", away: "4-4", div: "2-4", conf: "5-7", pf: 361, pa: 409, strk: "L2" },
      { status: "e", abbr: "NO", w: 6, l: 11, t: 0, pct: 0.353, home: "4-5", away: "2-6", div: "1-5", conf: "4-8", pf: 336, pa: 413, strk: "L3" },
    ],
    "NFC WEST": [
      { status: "*", abbr: "SEA", w: 14, l: 3, t: 0, pct: 0.824, home: "8-1", away: "6-2", div: "5-1", conf: "11-1", pf: 489, pa: 298, strk: "W1" },
      { status: "y", abbr: "LAR", w: 12, l: 5, t: 0, pct: 0.706, home: "7-2", away: "5-3", div: "4-2", conf: "9-3", pf: 468, pa: 296, strk: "L1" },
      { status: "y", abbr: "SF", w: 12, l: 5, t: 0, pct: 0.706, home: "7-2", away: "5-3", div: "3-3", conf: "9-3", pf: 445, pa: 379, strk: "W2" },
      { status: "e", abbr: "ARI", w: 3, l: 14, t: 0, pct: 0.176, home: "2-6", away: "1-8", div: "0-6", conf: "2-10", pf: 318, pa: 451, strk: "L4" },
    ],
  },
};

/** Demo playoff bracket (reference layout). */
export const PLAYOFF_BRACKET_2025 = {
  season: 2025,
  rounds: {
    wildCard: { label: "Wild Card", dates: "Jan 10–12" },
    divisional: { label: "Divisional", dates: "Jan 17–18" },
    conference: { label: "Conf. Championships", dates: "Jan 25" },
    superBowl: { label: "Super Bowl", dates: "Feb 8" },
  },
  superBowl: {
    title: "Super Bowl LX",
    location: "Santa Clara, CA",
    status: "Final",
    away: { seed: 2, abbr: "NE", score: 13 },
    home: { seed: 1, abbr: "SEA", score: 29 },
    winner: "home",
    championBanner: { abbr: "SEA", year: 2025 },
  },
  afc: {
    byes: [{ seed: 1, abbr: "DEN" }],
    wildCard: [
      { home: { seed: 4, abbr: "PIT", score: 6 }, away: { seed: 5, abbr: "HOU", score: 30 }, winner: "away", status: "Final" },
      { home: { seed: 3, abbr: "JAX", score: 24 }, away: { seed: 6, abbr: "BUF", score: 27 }, winner: "away", status: "Final" },
      { home: { seed: 2, abbr: "NE", score: 16 }, away: { seed: 7, abbr: "LAC", score: 3 }, winner: "home", status: "Final" },
    ],
    divisional: [
      { home: { seed: 1, abbr: "DEN", score: 33 }, away: { seed: 6, abbr: "BUF", score: 30 }, winner: "home", status: "Final/OT" },
      { home: { seed: 2, abbr: "NE", score: 28 }, away: { seed: 5, abbr: "HOU", score: 16 }, winner: "home", status: "Final" },
    ],
    championship: {
      home: { seed: 1, abbr: "DEN", score: 7 },
      away: { seed: 2, abbr: "NE", score: 10 },
      winner: "away",
      status: "Final",
    },
  },
  nfc: {
    byes: [{ seed: 1, abbr: "SEA" }],
    wildCard: [
      { home: { seed: 4, abbr: "CAR", score: 31 }, away: { seed: 5, abbr: "LAR", score: 34 }, winner: "away", status: "Final" },
      { home: { seed: 3, abbr: "PHI", score: 19 }, away: { seed: 6, abbr: "SF", score: 23 }, winner: "away", status: "Final" },
      { home: { seed: 2, abbr: "CHI", score: 31 }, away: { seed: 7, abbr: "GB", score: 27 }, winner: "home", status: "Final" },
    ],
    divisional: [
      { home: { seed: 1, abbr: "SEA", score: 41 }, away: { seed: 6, abbr: "SF", score: 6 }, winner: "home", status: "Final" },
      { home: { seed: 2, abbr: "CHI", score: 17 }, away: { seed: 5, abbr: "LAR", score: 20 }, winner: "away", status: "Final/OT" },
    ],
    championship: {
      home: { seed: 1, abbr: "SEA", score: 31 },
      away: { seed: 5, abbr: "LAR", score: 27 },
      winner: "home",
      status: "Final",
    },
  },
};

/**
 * Flatten division standings for expanded / conference views.
 * @param {Record<string, Record<string, StandingsRow[]>>} byDiv
 * @returns {Array<StandingsRow & { division: string, conference: "AFC" | "NFC" }>}
 */
export function flattenStandings(byDiv) {
  /** @type {Array<StandingsRow & { division: string, conference: "AFC" | "NFC" }>} */
  const out = [];
  for (const conference of /** @type {const} */ (["AFC", "NFC"])) {
    const divisions = byDiv[conference];
    for (const [division, rows] of Object.entries(divisions)) {
      for (const row of rows) {
        out.push({ ...row, division, conference });
      }
    }
  }
  return out;
}
