/** Earliest league season year exposed in LineupOS NFL pickers (live ESPN data). */
export const NFL_FIRST_SEASON = 2020;

/**
 * NFL regular-season kickoff is approximated as the first Thursday in September.
 * @param {number} year League season year.
 * @returns {Date}
 */
const nflSeasonKickoffThursday = (year) => {
  const sep1 = new Date(year, 8, 1);
  const dow = sep1.getDay();
  const daysToThursday = (4 - dow + 7) % 7;
  return new Date(year, 8, 1 + daysToThursday);
};

/**
 * Latest NFL season that should be treated as active/selectable.
 * Before kickoff, defaults to prior season.
 * @param {Date} [d]
 * @returns {number}
 */
const getCurrentNflSeasonYear = (d = new Date()) => {
  const year = d.getFullYear();
  const currentYearKickoff = nflSeasonKickoffThursday(year);
  const resolved = d < currentYearKickoff ? year - 1 : year;
  return Math.max(NFL_FIRST_SEASON, resolved);
};

/**
 * Descending league years from active NFL season through NFL_FIRST_SEASON.
 * @returns {number[]}
 */
export function getNflSeasonYearOptions() {
  const y = getCurrentNflSeasonYear();
  const out = [];
  for (let yr = y; yr >= NFL_FIRST_SEASON; yr -= 1) {
    out.push(yr);
  }
  return out;
}

/**
 * Default season for NFL views (kickoff-aware season year anchor).
 * @returns {number}
 */
export function getDefaultNflSeasonYear() {
  return getCurrentNflSeasonYear();
}
