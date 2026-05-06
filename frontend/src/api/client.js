import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({ baseURL });

/**
 * Fetch current week's lineup from FastAPI.
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getCurrentLineup = () => api.get("/api/lineup/current");

/**
 * Fetch lineup for a specific fantasy week.
 * @param {number} season Season year
 * @param {number} week Week number
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getLineupByWeek = (season, week) =>
  api.get(`/api/lineup/${season}/${week}`);

/**
 * List players with optional position filter.
 * @param {string | undefined} position Position code (e.g. QB)
 * @param {{ season?: number, week?: number } | undefined} options Optional season/week projection context
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getAllPlayers = (position, options) =>
  api.get("/api/players", {
    params: {
      position,
      season: options?.season,
      week: options?.week,
    },
  });

/**
 * Historical stats for one player.
 * @param {number} id Database player id
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getPlayerStats = (id) => api.get(`/api/players/${id}/stats`);

/**
 * Historical stats for one player by Sleeper id (DB row created on demand if needed).
 * @param {string} sleeperId Sleeper player id
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getPlayerStatsBySleeper = (sleeperId) =>
  api.get(`/api/players/sleeper/${encodeURIComponent(sleeperId)}/stats`);

/**
 * Fetch aggregated season leaders for a category and split.
 * @param {{
 *   category: string,
 *   season: number,
 *   split: "regular" | "postseason",
 *   conference: "all" | "afc" | "nfc"
 * }} params Query options
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getSeasonLeaders = (params) =>
  api.get("/api/players/season-leaders", { params });

/**
 * Live NFL scoreboard for one week (proxied via FastAPI; sources ESPN by default).
 * @param {number} season League year (e.g. 2025)
 * @param {number} week Schedule week (1–18 regular)
 * @param {number} [seasontype=2] ESPN season type (2 = regular season)
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getNflScoreboard = (season, week, seasontype = 2) =>
  api.get("/api/nfl/scoreboard", {
    params: { season, week, seasontype },
  });

/**
 * Box score + play-by-play for one ESPN event id (normalized by FastAPI).
 * @param {string} gameId Numeric ESPN game / event id
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getNflGameDetail = (gameId) =>
  api.get(`/api/nfl/games/${encodeURIComponent(gameId)}/detail`);

/**
 * Live NFL standings (regular or postseason) via FastAPI.
 * @param {number} season League year
 * @param {number} [seasontype=2] 2 regular, 3 postseason
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getNflStandings = (season, seasontype = 2) =>
  api.get("/api/nfl/standings", { params: { season, seasontype } });

/**
 * Super Bowl champions by season (ESPN when reliable, else verified fallback).
 * @param {number} [fromSeason=2020]
 * @param {number} [toSeason] defaults to server max
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getNflChampionships = (fromSeason = 2020, toSeason) =>
  api.get("/api/nfl/championships", {
    params: { from_season: fromSeason, ...(toSeason != null ? { to_season: toSeason } : {}) },
  });

/**
 * Full team schedule for one league year.
 * @param {string} teamAbbr e.g. BUF
 * @param {number} season League year
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getNflTeamSchedule = (teamAbbr, season) =>
  api.get(`/api/nfl/teams/${encodeURIComponent(teamAbbr)}/schedule`, {
    params: { season },
  });
