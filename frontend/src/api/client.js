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
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getAllPlayers = (position) =>
  api.get("/api/players", { params: { position } });

/**
 * Historical stats for one player.
 * @param {number} id Database player id
 * @returns {Promise<import("axios").AxiosResponse>}
 */
export const getPlayerStats = (id) => api.get(`/api/players/${id}/stats`);
