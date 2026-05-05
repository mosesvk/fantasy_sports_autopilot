/**
 * Build a Sleeper player headshot URL from Sleeper player id.
 * @param {string | null | undefined} sleeperId Sleeper player id.
 * @returns {string | null} Headshot URL or null when unavailable.
 */
export const getPlayerHeadshotUrl = (sleeperId) => {
  if (!sleeperId) return null;
  return `https://sleepercdn.com/content/nfl/players/${sleeperId}.jpg`;
};

/**
 * Build an NFL team logo URL from team abbreviation.
 * @param {string | null | undefined} team Team abbreviation (e.g. KC, PHI).
 * @returns {string | null} Team logo URL or null when unavailable.
 */
export const getTeamLogoUrl = (team) => {
  if (!team) return null;
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${team.toLowerCase()}.png`;
};
