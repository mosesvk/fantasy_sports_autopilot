/** Earliest league season year exposed in LineupOS NFL pickers (live ESPN data). */
export const NFL_FIRST_SEASON = 2020;

/**
 * Descending league years from (current calendar year + 1) through NFL_FIRST_SEASON.
 * @returns {number[]}
 */
export function getNflSeasonYearOptions() {
  const y = new Date().getFullYear();
  const out = [];
  for (let yr = y + 1; yr >= NFL_FIRST_SEASON; yr -= 1) {
    out.push(yr);
  }
  return out;
}

/**
 * Default season for scoreboard-style views (current calendar year as league year anchor).
 * @returns {number}
 */
export function getDefaultNflSeasonYear() {
  return new Date().getFullYear();
}
