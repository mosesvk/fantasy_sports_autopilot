/**
 * Demo NFL scoreboard and schedule rows for Scores / Schedule tabs (no live API yet).
 */

/** @typedef {{ week: number, label: string, range: string }} WeekStripItem */

/** @typedef {{ q: number[], total: number }} TeamScoreLine */

/**
 * @typedef {{
 *   status: string,
 *   away: { abbr: string, record: string, split: string, score: TeamScoreLine },
 *   home: { abbr: string, record: string, split: string, score: TeamScoreLine },
 *   headline: string,
 *   summary: string,
 *   performers: {
 *     pass: { name: string, detail: string },
 *     rush: { name: string, detail: string },
 *     rec: { name: string, detail: string },
 *   },
 * }} ScoreboardGame
 */

/** @typedef {{ dateLabel: string, games: ScoreboardGame[] }} ScoreboardDay */

/** Season label used in UI copy. */
export const DEMO_NFL_SEASON = 2025;

/** Horizontal week strip labels (subset for demo). */
export const NFL_WEEK_STRIP = /** @type {WeekStripItem[]} */ ([
  { week: 10, label: "WEEK 10", range: "OCT 29 - NOV 4" },
  { week: 11, label: "WEEK 11", range: "NOV 5 - NOV 11" },
  { week: 12, label: "WEEK 12", range: "NOV 19 - NOV 25" },
  { week: 13, label: "WEEK 13", range: "NOV 26 - DEC 2" },
  { week: 14, label: "WEEK 14", range: "DEC 3 - DEC 9" },
]);

/**
 * Scoreboard content keyed by week number.
 * @type {Record<number, ScoreboardDay[]>}
 */
export const SCOREBOARD_WEEKS = {
  12: [
    {
      dateLabel: "Thursday, November 20, 2025",
      games: [
        {
          status: "FINAL",
          away: {
            abbr: "BUF",
            record: "7-4",
            split: "2-3 Away",
            score: { q: [0, 3, 7, 7], total: 17 },
          },
          home: {
            abbr: "HOU",
            record: "7-4",
            split: "4-1 Home",
            score: { q: [7, 3, 0, 9], total: 19 },
          },
          headline: "Texans' defense dominates in close win over Bills",
          summary:
            "Houston generated pressure all night while the offense did enough late to seal a narrow victory at home.",
          performers: {
            pass: { name: "J. Allen", detail: "QB #17 BUF | 24/34, 253 YDS, 2 INT" },
            rush: { name: "J. Mixon", detail: "RB #28 HOU | 22 CAR, 88 YDS" },
            rec: { name: "S. Diggs", detail: "WR #14 HOU | 6 REC, 78 YDS" },
          },
        },
      ],
    },
    {
      dateLabel: "Sunday, November 23, 2025",
      games: [
        {
          status: "FINAL",
          away: {
            abbr: "KC",
            record: "10-1",
            split: "5-0 Away",
            score: { q: [7, 10, 3, 7], total: 27 },
          },
          home: {
            abbr: "IND",
            record: "8-3",
            split: "5-1 Home",
            score: { q: [3, 7, 7, 7], total: 24 },
          },
          headline: "Chiefs outlast Colts in AFC heavyweight bout",
          summary: "Kansas City pulled away in the fourth quarter after a back-and-forth afternoon in Indianapolis.",
          performers: {
            pass: { name: "P. Mahomes", detail: "QB #15 KC | 28/38, 302 YDS, 2 TD" },
            rush: { name: "I. Pacheco", detail: "RB #10 KC | 18 CAR, 76 YDS" },
            rec: { name: "T. Kelce", detail: "TE #87 KC | 8 REC, 92 YDS" },
          },
        },
        {
          status: "FINAL/OT",
          away: {
            abbr: "DET",
            record: "8-3",
            split: "4-2 Away",
            score: { q: [0, 10, 7, 7, 3], total: 27 },
          },
          home: {
            abbr: "GB",
            record: "7-4",
            split: "4-2 Home",
            score: { q: [7, 3, 7, 7, 0], total: 24 },
          },
          headline: "Lions win division thriller in overtime",
          summary: "Detroit survives a Lambeau shootout after trading blows through regulation.",
          performers: {
            pass: { name: "J. Goff", detail: "QB #16 DET | 31/42, 331 YDS, 2 TD" },
            rush: { name: "J. Gibbs", detail: "RB #26 DET | 19 CAR, 112 YDS" },
            rec: { name: "A. St. Brown", detail: "WR #14 DET | 11 REC, 126 YDS" },
          },
        },
      ],
    },
  ],
  11: [
    {
      dateLabel: "Sunday, November 16, 2025",
      games: [
        {
          status: "FINAL",
          away: { abbr: "PHI", record: "9-2", split: "4-1 Away", score: { q: [3, 7, 7, 10], total: 27 } },
          home: { abbr: "DAL", record: "6-5", split: "3-3 Home", score: { q: [7, 0, 3, 7], total: 17 } },
          headline: "Eagles control the line of scrimmage in Dallas",
          summary: "Philadelphia leaned on the run game and timely throws to sweep the season series.",
          performers: {
            pass: { name: "J. Hurts", detail: "QB #1 PHI | 19/27, 242 YDS, 2 TD" },
            rush: { name: "S. Barkley", detail: "RB #26 PHI | 24 CAR, 118 YDS" },
            rec: { name: "D. Smith", detail: "WR #6 PHI | 7 REC, 98 YDS" },
          },
        },
      ],
    },
  ],
  10: [
    {
      dateLabel: "Sunday, November 9, 2025",
      games: [
        {
          status: "FINAL",
          away: { abbr: "BAL", record: "8-3", split: "4-2 Away", score: { q: [7, 3, 7, 7], total: 24 } },
          home: { abbr: "CLE", record: "3-8", split: "2-4 Home", score: { q: [0, 6, 3, 6], total: 15 } },
          headline: "Ravens defense stifles Browns in road win",
          summary: "Baltimore forced three turnovers and controlled tempo from the opening kickoff.",
          performers: {
            pass: { name: "L. Jackson", detail: "QB #8 BAL | 18/25, 228 YDS, 1 TD" },
            rush: { name: "D. Henry", detail: "RB #22 BAL | 21 CAR, 94 YDS" },
            rec: { name: "Z. Flowers", detail: "WR #4 BAL | 6 REC, 84 YDS" },
          },
        },
      ],
    },
  ],
  13: [
    {
      dateLabel: "Sunday, November 30, 2025",
      games: [
        {
          status: "FINAL",
          away: { abbr: "SF", record: "9-3", split: "4-2 Away", score: { q: [3, 7, 7, 10], total: 27 } },
          home: { abbr: "SEA", record: "8-4", split: "5-2 Home", score: { q: [7, 6, 0, 10], total: 23 } },
          headline: "49ers edge Seahawks in NFC West clash",
          summary: "San Francisco made a late stand to hold off a furious Seattle rally.",
          performers: {
            pass: { name: "B. Purdy", detail: "QB #13 SF | 22/30, 268 YDS, 2 TD" },
            rush: { name: "C. McCaffrey", detail: "RB #23 SF | 17 CAR, 89 YDS" },
            rec: { name: "G. Kittle", detail: "TE #85 SF | 8 REC, 102 YDS" },
          },
        },
      ],
    },
  ],
  14: [
    {
      dateLabel: "Sunday, December 7, 2025",
      games: [
        {
          status: "FINAL",
          away: { abbr: "PIT", record: "9-4", split: "4-3 Away", score: { q: [0, 10, 7, 6], total: 23 } },
          home: { abbr: "CLE", record: "4-9", split: "3-4 Home", score: { q: [3, 0, 7, 10], total: 20 } },
          headline: "Steelers grind out road win in Cleveland",
          summary: "Pittsburgh leaned on defense and a steady second-half drive to escape with the victory.",
          performers: {
            pass: { name: "A. Brown", detail: "QB #5 PIT | 24/35, 251 YDS, 1 TD" },
            rush: { name: "J. Warren", detail: "RB #30 PIT | 16 CAR, 71 YDS" },
            rec: { name: "G. Pickens", detail: "WR #14 PIT | 6 REC, 88 YDS" },
          },
        },
      ],
    },
  ],
};

/**
 * @typedef {{
 *   awayAbbr: string,
 *   homeAbbr: string,
 *   resultLabel: string,
 *   passLeader: string,
 *   rushLeader: string,
 *   recLeader: string,
 * }} ScheduleRow
 */

/**
 * @typedef {{ dateLabel: string, rows: ScheduleRow[] }} ScheduleDay
 */

/** Full-league schedule table (demo) keyed by week. */
export const LEAGUE_SCHEDULE_WEEKS = /** @type {Record<number, ScheduleDay[]>} */ ({
  18: [
    {
      dateLabel: "Saturday, January 3, 2026",
      rows: [
        {
          awayAbbr: "CAR",
          homeAbbr: "TB",
          resultLabel: "TB 16, CAR 14",
          passLeader: "Bryce Young 266",
          rushLeader: "Chuba Hubbard 71",
          recLeader: "Adam Thielen 82",
        },
        {
          awayAbbr: "LAC",
          homeAbbr: "DEN",
          resultLabel: "DEN 24, LAC 17",
          passLeader: "Bo Nix 251",
          rushLeader: "Javonte Williams 88",
          recLeader: "Courtland Sutton 95",
        },
      ],
    },
    {
      dateLabel: "Sunday, January 4, 2026",
      rows: [
        {
          awayAbbr: "MIA",
          homeAbbr: "NE",
          resultLabel: "NE 20, MIA 13",
          passLeader: "Drake Maye 268",
          rushLeader: "Rhamondre Stevenson 76",
          recLeader: "Kayshon Boutte 71",
        },
      ],
    },
  ],
  17: [
    {
      dateLabel: "Sunday, December 28, 2025",
      rows: [
        {
          awayAbbr: "NYJ",
          homeAbbr: "BUF",
          resultLabel: "BUF 27, NYJ 10",
          passLeader: "Josh Allen 290",
          rushLeader: "James Cook 95",
          recLeader: "Khalil Shakir 88",
        },
      ],
    },
  ],
});

/** All NFL team abbreviations for schedule dropdown (alphabetical by city). */
export const ALL_TEAM_ABBRS = [
  "ARI",
  "ATL",
  "BAL",
  "BUF",
  "CAR",
  "CHI",
  "CIN",
  "CLE",
  "DAL",
  "DEN",
  "DET",
  "GB",
  "HOU",
  "IND",
  "JAX",
  "KC",
  "LAC",
  "LAR",
  "LV",
  "MIA",
  "MIN",
  "NE",
  "NO",
  "NYG",
  "NYJ",
  "PHI",
  "PIT",
  "SEA",
  "SF",
  "TB",
  "TEN",
  "WSH",
];

/**
 * @typedef {{
 *   weekLabel: string,
 *   dateLabel: string,
 *   opponentAbbr: string,
 *   home: boolean,
 *   result: string,
 *   wl: string,
 *   hiPass: string,
 *   hiRush: string,
 * }} TeamScheduleRow
 */

/** Demo team-specific schedule (Chicago). */
export const TEAM_SCHEDULE_CHI_2025 = /** @type {{ postseason: TeamScheduleRow[], regular: TeamScheduleRow[] }} */ ({
  postseason: [
    {
      weekLabel: "WC",
      dateLabel: "Sat, Jan 10",
      opponentAbbr: "GB",
      home: true,
      result: "W 31-27",
      wl: "11-6",
      hiPass: "C. Williams 361",
      hiRush: "D. Swift 54",
    },
    {
      weekLabel: "DIV",
      dateLabel: "Sun, Jan 18",
      opponentAbbr: "MIN",
      home: false,
      result: "L 24-21",
      wl: "11-7",
      hiPass: "C. Williams 298",
      hiRush: "D. Swift 62",
    },
  ],
  regular: [
    {
      weekLabel: "1",
      dateLabel: "Mon, Sep 8",
      opponentAbbr: "MIN",
      home: true,
      result: "L 27-24",
      wl: "0-1",
      hiPass: "C. Williams 210",
      hiRush: "D. Swift 58",
    },
    {
      weekLabel: "2",
      dateLabel: "Sun, Sep 14",
      opponentAbbr: "DET",
      home: false,
      result: "W 24-20",
      wl: "1-1",
      hiPass: "C. Williams 245",
      hiRush: "K. Herbert 72",
    },
    {
      weekLabel: "3",
      dateLabel: "Sun, Sep 21",
      opponentAbbr: "GB",
      home: true,
      result: "W 30-27",
      wl: "2-1",
      hiPass: "C. Williams 268",
      hiRush: "D. Swift 81",
    },
    {
      weekLabel: "4",
      dateLabel: "Sun, Sep 28",
      opponentAbbr: "WSH",
      home: false,
      result: "L 17-14",
      wl: "2-2",
      hiPass: "C. Williams 198",
      hiRush: "D. Swift 44",
    },
    {
      weekLabel: "5",
      dateLabel: "—",
      opponentAbbr: "",
      home: false,
      result: "BYE",
      wl: "2-2",
      hiPass: "—",
      hiRush: "—",
    },
    {
      weekLabel: "6",
      dateLabel: "Sun, Oct 12",
      opponentAbbr: "SF",
      home: true,
      result: "W 28-19",
      wl: "3-2",
      hiPass: "C. Williams 251",
      hiRush: "D. Swift 67",
    },
    {
      weekLabel: "7",
      dateLabel: "Sun, Oct 19",
      opponentAbbr: "MIN",
      home: false,
      result: "W 21-17",
      wl: "4-2",
      hiPass: "C. Williams 220",
      hiRush: "R. Johnson 55",
    },
    {
      weekLabel: "8",
      dateLabel: "Sun, Oct 26",
      opponentAbbr: "CIN",
      home: true,
      result: "L 23-20",
      wl: "4-3",
      hiPass: "C. Williams 275",
      hiRush: "D. Swift 48",
    },
  ],
});
