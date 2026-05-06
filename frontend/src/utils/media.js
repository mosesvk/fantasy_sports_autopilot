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

/**
 * ESPN CDN headshot for an NFL athlete id (from scoreboard leader payloads).
 * @param {string | null | undefined} espnAthleteId Numeric ESPN athlete id as string.
 * @returns {string | null}
 */
export const getEspnNflHeadshotUrl = (espnAthleteId) => {
  if (!espnAthleteId) return null;
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnAthleteId}.png`;
};

/** ESPN CDN shield (PNG) — same host as team logos. */
export const NFL_LEAGUE_LOGO_URL_ESPN = "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png";

/** Wikimedia Commons NFL mark (SVG) if ESPN asset fails. */
export const NFL_LEAGUE_LOGO_URL_WIKI =
  "https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg";
