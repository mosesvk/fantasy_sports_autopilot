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
