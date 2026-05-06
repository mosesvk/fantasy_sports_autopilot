import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllPlayers, getSeasonLeaders } from "../api/client.js";
import StatsDrawer from "./StatsDrawer.jsx";
import { getPlayerHeadshotUrl, getTeamLogoUrl } from "../utils/media.js";
import { getDefaultNflSeasonYear, getNflSeasonYearOptions } from "../utils/nflSeasons.js";

/**
 * Build a deterministic player portrait URL from player name.
 * @param {string} playerName Full player name.
 * @returns {string} Player avatar URL.
 */
const getPlayerPortraitUrl = (playerName) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    playerName,
  )}&background=2563eb&color=ffffff&size=64&bold=true&format=png`;

/**
 * Return the primary team code for logo lookups.
 * @param {string} teamValue Team abbreviation string.
 * @returns {string} Primary team code.
 */
const getPrimaryTeamCode = (teamValue) => teamValue.split("/")[0];

/**
 * Team abbreviation or status label for a season-leader row.
 * @param {{ team?: string | null, isRetired?: boolean }} row Leader row from API.
 * @returns {string} Team code, Retired, or em dash when unknown.
 */
const statRowTeamLabel = (row) => {
  if (row.isRetired) return "Retired";
  const t = row.team;
  return t != null && String(t) !== "" ? String(t) : "—";
};

/**
 * Normalize player names so stat-table rows can map to API players.
 * @param {string} value Raw player name.
 * @returns {string} Normalized name key.
 */
const normalizeName = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const MAIN_STAT_TABS = ["Offense", "Defense", "Scoring", "Special Teams"];
const SEASON_SPLITS = ["Regular Season", "Postseason"];
const CONFERENCE_FILTERS = ["All NFL", "AFC", "NFC"];

const TEAM_CONFERENCE_MAP = {
  ARI: "NFC",
  ATL: "NFC",
  BAL: "AFC",
  BUF: "AFC",
  CAR: "NFC",
  CHI: "NFC",
  CIN: "AFC",
  CLE: "AFC",
  DAL: "NFC",
  DEN: "AFC",
  DET: "NFC",
  GB: "NFC",
  HOU: "AFC",
  IND: "AFC",
  JAX: "AFC",
  KC: "AFC",
  LAR: "NFC",
  LV: "AFC",
  MIA: "AFC",
  NE: "AFC",
  NO: "NFC",
  NYG: "NFC",
  PHI: "NFC",
  PIT: "AFC",
  SEA: "NFC",
  SF: "NFC",
  TB: "NFC",
  TEN: "AFC",
  WSH: "NFC",
};

const OFFENSIVE_LEADERS = [
  {
    id: "passing",
    title: "Passing",
    metricLabel: "YDS",
    rows: [
      { rank: 1, player: "Matthew Stafford", team: "LAR", value: "4,707" },
      { rank: 2, player: "Jared Goff", team: "DET", value: "4,564" },
      { rank: 3, player: "Dak Prescott", team: "DAL", value: "4,552" },
      { rank: 4, player: "Drake Maye", team: "NE", value: "4,394" },
      { rank: 5, player: "Sam Darnold", team: "SEA", value: "4,048" },
    ],
  },
  {
    id: "rushing",
    title: "Rushing",
    metricLabel: "YDS",
    rows: [
      { rank: 1, player: "James Cook", team: "BUF", value: "1,621" },
      { rank: 2, player: "Derrick Henry", team: "BAL", value: "1,595" },
      { rank: 3, player: "Jonathan Taylor", team: "IND", value: "1,585" },
      { rank: 4, player: "Bijan Robinson", team: "ATL", value: "1,478" },
      { rank: 5, player: "De'Von Achane", team: "MIA", value: "1,350" },
    ],
  },
  {
    id: "receiving",
    title: "Receiving",
    metricLabel: "YDS",
    rows: [
      { rank: 1, player: "Jaxon Smith-Njigba", team: "SEA", value: "1,793" },
      { rank: 2, player: "Puka Nacua", team: "LAR", value: "1,715" },
      { rank: 3, player: "George Pickens", team: "DAL", value: "1,429" },
      { rank: 4, player: "Ja'Marr Chase", team: "CIN", value: "1,412" },
      { rank: 5, player: "Amon-Ra St. Brown", team: "DET", value: "1,401" },
    ],
  },
];

const DEFENSIVE_LEADERS = [
  {
    id: "tackles",
    title: "Tackles",
    metricLabel: "TOT",
    rows: [
      { rank: 1, player: "Jordyn Brooks", team: "MIA", value: "183" },
      { rank: 2, player: "Jack Campbell", team: "DET", value: "176" },
      { rank: 3, player: "Devin White", team: "LV", value: "174" },
      { rank: 4, player: "Cedric Gray", team: "TEN", value: "164" },
      { rank: 5, player: "Bobby Wagner", team: "WSH", value: "162" },
    ],
  },
  {
    id: "sacks",
    title: "Sacks",
    metricLabel: "SACK",
    rows: [
      { rank: 1, player: "Myles Garrett", team: "CLE", value: "23.0" },
      { rank: 2, player: "Brian Burns", team: "NYG", value: "16.5" },
      { rank: 3, player: "Danielle Hunter", team: "HOU", value: "15.0" },
      { rank: 4, player: "Aidan Hutchinson", team: "DET", value: "14.5" },
      { rank: 5, player: "Nik Bonitto", team: "DEN", value: "14.0" },
    ],
  },
  {
    id: "interceptions",
    title: "Interceptions",
    metricLabel: "INT",
    rows: [
      { rank: 1, player: "Kevin Byard", team: "NE/CHI", value: "7" },
      { rank: 2, player: "Devin Lloyd", team: "CAR/JAX", value: "5" },
      { rank: 2, player: "Jaycee Horn", team: "CAR", value: "5" },
      { rank: 2, player: "Ernest Jones IV", team: "SEA", value: "5" },
      { rank: 2, player: "Antonio Johnson", team: "JAX", value: "5" },
    ],
  },
];

const PLAYER_STATS_SHEET_DATA = {
  passing: {
    mainTab: "Offense",
    title: "Passing",
    columns: [
      { key: "rank", label: "RK", numeric: true },
      { key: "player", label: "NAME" },
      { key: "position", label: "POS" },
      { key: "gamesPlayed", label: "GP", numeric: true },
      { key: "completions", label: "CMP", numeric: true },
      { key: "attempts", label: "ATT", numeric: true },
      { key: "completionPct", label: "CMP%", numeric: true },
      { key: "yards", label: "YDS", numeric: true },
      { key: "yardsPerGame", label: "YDS/G", numeric: true },
      { key: "touchdowns", label: "TD", numeric: true },
      { key: "interceptions", label: "INT", numeric: true },
    ],
    rows: [
      { rank: 1, player: "Matthew Stafford", team: "LAR", position: "QB", gamesPlayed: 17, completions: 388, attempts: 537, completionPct: 65.0, yards: 4707, yardsPerGame: 276.9, touchdowns: 46, interceptions: 8 },
      { rank: 2, player: "Jared Goff", team: "DET", position: "QB", gamesPlayed: 17, completions: 393, attempts: 578, completionPct: 68.0, yards: 4564, yardsPerGame: 268.5, touchdowns: 34, interceptions: 8 },
      { rank: 3, player: "Dak Prescott", team: "DAL", position: "QB", gamesPlayed: 17, completions: 404, attempts: 600, completionPct: 67.3, yards: 4552, yardsPerGame: 267.8, touchdowns: 30, interceptions: 10 },
      { rank: 4, player: "Drake Maye", team: "NE", position: "QB", gamesPlayed: 17, completions: 354, attempts: 492, completionPct: 72.0, yards: 4394, yardsPerGame: 258.5, touchdowns: 32, interceptions: 8 },
      { rank: 5, player: "Sam Darnold", team: "SEA", position: "QB", gamesPlayed: 17, completions: 323, attempts: 477, completionPct: 67.7, yards: 4048, yardsPerGame: 238.1, touchdowns: 27, interceptions: 14 },
    ],
  },
  rushing: {
    mainTab: "Offense",
    title: "Rushing",
    columns: [
      { key: "rank", label: "RK", numeric: true },
      { key: "player", label: "NAME" },
      { key: "position", label: "POS" },
      { key: "gamesPlayed", label: "GP", numeric: true },
      { key: "attempts", label: "ATT", numeric: true },
      { key: "yards", label: "YDS", numeric: true },
      { key: "yardsPerCarry", label: "AVG", numeric: true },
      { key: "yardsPerGame", label: "YDS/G", numeric: true },
      { key: "longest", label: "LNG", numeric: true },
      { key: "touchdowns", label: "TD", numeric: true },
    ],
    rows: [
      { rank: 1, player: "James Cook", team: "BUF", position: "RB", gamesPlayed: 17, attempts: 286, yards: 1621, yardsPerCarry: 5.7, yardsPerGame: 95.4, longest: 46, touchdowns: 13 },
      { rank: 2, player: "Derrick Henry", team: "BAL", position: "RB", gamesPlayed: 17, attempts: 312, yards: 1595, yardsPerCarry: 5.1, yardsPerGame: 93.8, longest: 42, touchdowns: 12 },
      { rank: 3, player: "Jonathan Taylor", team: "IND", position: "RB", gamesPlayed: 16, attempts: 297, yards: 1585, yardsPerCarry: 5.3, yardsPerGame: 99.1, longest: 39, touchdowns: 11 },
      { rank: 4, player: "Bijan Robinson", team: "ATL", position: "RB", gamesPlayed: 17, attempts: 281, yards: 1478, yardsPerCarry: 5.3, yardsPerGame: 86.9, longest: 37, touchdowns: 10 },
      { rank: 5, player: "De'Von Achane", team: "MIA", position: "RB", gamesPlayed: 16, attempts: 232, yards: 1350, yardsPerCarry: 5.8, yardsPerGame: 84.4, longest: 55, touchdowns: 9 },
    ],
  },
  receiving: {
    mainTab: "Offense",
    title: "Receiving",
    columns: [
      { key: "rank", label: "RK", numeric: true },
      { key: "player", label: "NAME" },
      { key: "position", label: "POS" },
      { key: "gamesPlayed", label: "GP", numeric: true },
      { key: "receptions", label: "REC", numeric: true },
      { key: "targets", label: "TGTS", numeric: true },
      { key: "yards", label: "YDS", numeric: true },
      { key: "yardsPerCatch", label: "AVG", numeric: true },
      { key: "yardsPerGame", label: "YDS/G", numeric: true },
      { key: "touchdowns", label: "TD", numeric: true },
    ],
    rows: [
      { rank: 1, player: "Jaxon Smith-Njigba", team: "SEA", position: "WR", gamesPlayed: 17, receptions: 122, targets: 168, yards: 1793, yardsPerCatch: 14.7, yardsPerGame: 105.5, touchdowns: 10 },
      { rank: 2, player: "Puka Nacua", team: "LAR", position: "WR", gamesPlayed: 17, receptions: 118, targets: 161, yards: 1715, yardsPerCatch: 14.5, yardsPerGame: 100.9, touchdowns: 9 },
      { rank: 3, player: "George Pickens", team: "DAL", position: "WR", gamesPlayed: 17, receptions: 92, targets: 133, yards: 1429, yardsPerCatch: 15.5, yardsPerGame: 84.1, touchdowns: 8 },
      { rank: 4, player: "Ja'Marr Chase", team: "CIN", position: "WR", gamesPlayed: 16, receptions: 101, targets: 149, yards: 1412, yardsPerCatch: 14.0, yardsPerGame: 88.3, touchdowns: 12 },
      { rank: 5, player: "Amon-Ra St. Brown", team: "DET", position: "WR", gamesPlayed: 17, receptions: 113, targets: 159, yards: 1401, yardsPerCatch: 12.4, yardsPerGame: 82.4, touchdowns: 9 },
    ],
  },
  tackles: {
    mainTab: "Defense",
    title: "Tackles",
    columns: [
      { key: "rank", label: "RK", numeric: true },
      { key: "player", label: "NAME" },
      { key: "position", label: "POS" },
      { key: "gamesPlayed", label: "GP", numeric: true },
      { key: "solo", label: "SOLO", numeric: true },
      { key: "assists", label: "AST", numeric: true },
      { key: "tackles", label: "TOT", numeric: true },
      { key: "tacklesForLoss", label: "TFL", numeric: true },
    ],
    rows: [
      { rank: 1, player: "Jordyn Brooks", team: "MIA", position: "LB", gamesPlayed: 17, solo: 116, assists: 67, tackles: 183, tacklesForLoss: 12 },
      { rank: 2, player: "Jack Campbell", team: "DET", position: "LB", gamesPlayed: 17, solo: 109, assists: 67, tackles: 176, tacklesForLoss: 11 },
      { rank: 3, player: "Devin White", team: "LV", position: "LB", gamesPlayed: 17, solo: 104, assists: 70, tackles: 174, tacklesForLoss: 9 },
      { rank: 4, player: "Cedric Gray", team: "TEN", position: "LB", gamesPlayed: 17, solo: 98, assists: 66, tackles: 164, tacklesForLoss: 8 },
      { rank: 5, player: "Bobby Wagner", team: "WSH", position: "LB", gamesPlayed: 17, solo: 95, assists: 67, tackles: 162, tacklesForLoss: 10 },
    ],
  },
  sacks: {
    mainTab: "Defense",
    title: "Sacks",
    columns: [
      { key: "rank", label: "RK", numeric: true },
      { key: "player", label: "NAME" },
      { key: "position", label: "POS" },
      { key: "gamesPlayed", label: "GP", numeric: true },
      { key: "sacks", label: "SACK", numeric: true },
      { key: "forcedFumbles", label: "FF", numeric: true },
      { key: "tacklesForLoss", label: "TFL", numeric: true },
      { key: "qbHits", label: "QBH", numeric: true },
    ],
    rows: [
      { rank: 1, player: "Myles Garrett", team: "CLE", position: "DE", gamesPlayed: 17, sacks: 23.0, forcedFumbles: 4, tacklesForLoss: 22, qbHits: 36 },
      { rank: 2, player: "Brian Burns", team: "NYG", position: "DE", gamesPlayed: 17, sacks: 16.5, forcedFumbles: 3, tacklesForLoss: 17, qbHits: 29 },
      { rank: 3, player: "Danielle Hunter", team: "HOU", position: "DE", gamesPlayed: 17, sacks: 15.0, forcedFumbles: 2, tacklesForLoss: 16, qbHits: 27 },
      { rank: 4, player: "Aidan Hutchinson", team: "DET", position: "DE", gamesPlayed: 17, sacks: 14.5, forcedFumbles: 3, tacklesForLoss: 15, qbHits: 25 },
      { rank: 5, player: "Nik Bonitto", team: "DEN", position: "OLB", gamesPlayed: 17, sacks: 14.0, forcedFumbles: 2, tacklesForLoss: 14, qbHits: 24 },
    ],
  },
  interceptions: {
    mainTab: "Defense",
    title: "Interceptions",
    columns: [
      { key: "rank", label: "RK", numeric: true },
      { key: "player", label: "NAME" },
      { key: "position", label: "POS" },
      { key: "gamesPlayed", label: "GP", numeric: true },
      { key: "interceptions", label: "INT", numeric: true },
      { key: "passesDefended", label: "PD", numeric: true },
      { key: "returnYards", label: "RET YDS", numeric: true },
      { key: "touchdowns", label: "TD", numeric: true },
    ],
    rows: [
      { rank: 1, player: "Kevin Byard", team: "NE", position: "S", gamesPlayed: 17, interceptions: 7, passesDefended: 15, returnYards: 113, touchdowns: 1 },
      { rank: 2, player: "Devin Lloyd", team: "JAX", position: "LB", gamesPlayed: 17, interceptions: 5, passesDefended: 9, returnYards: 78, touchdowns: 0 },
      { rank: 2, player: "Jaycee Horn", team: "CAR", position: "CB", gamesPlayed: 16, interceptions: 5, passesDefended: 16, returnYards: 96, touchdowns: 1 },
      { rank: 2, player: "Ernest Jones IV", team: "SEA", position: "LB", gamesPlayed: 17, interceptions: 5, passesDefended: 8, returnYards: 65, touchdowns: 0 },
      { rank: 2, player: "Antonio Johnson", team: "JAX", position: "S", gamesPlayed: 17, interceptions: 5, passesDefended: 10, returnYards: 72, touchdowns: 0 },
    ],
  },
  touchdowns: {
    mainTab: "Scoring",
    title: "Touchdowns",
    columns: [
      { key: "rank", label: "RK", numeric: true },
      { key: "player", label: "NAME" },
      { key: "position", label: "POS" },
      { key: "gamesPlayed", label: "GP", numeric: true },
      { key: "touchdowns", label: "TD", numeric: true },
      { key: "points", label: "PTS", numeric: true },
    ],
    rows: [
      { rank: 1, player: "Christian McCaffrey", team: "SF", position: "RB", gamesPlayed: 17, touchdowns: 18, points: 108 },
      { rank: 2, player: "Tyreek Hill", team: "MIA", position: "WR", gamesPlayed: 17, touchdowns: 15, points: 90 },
      { rank: 3, player: "Jalen Hurts", team: "PHI", position: "QB", gamesPlayed: 17, touchdowns: 14, points: 84 },
      { rank: 4, player: "Raheem Mostert", team: "MIA", position: "RB", gamesPlayed: 17, touchdowns: 14, points: 84 },
      { rank: 5, player: "Amon-Ra St. Brown", team: "DET", position: "WR", gamesPlayed: 17, touchdowns: 12, points: 72 },
    ],
  },
  kicking: {
    mainTab: "Special Teams",
    title: "Kicking",
    columns: [
      { key: "rank", label: "RK", numeric: true },
      { key: "player", label: "NAME" },
      { key: "team", label: "TEAM" },
      { key: "gamesPlayed", label: "GP", numeric: true },
      { key: "fgMade", label: "FGM", numeric: true },
      { key: "fgAttempts", label: "FGA", numeric: true },
      { key: "fgPct", label: "FG%", numeric: true },
      { key: "xpMade", label: "XPM", numeric: true },
      { key: "points", label: "PTS", numeric: true },
    ],
    rows: [
      { rank: 1, player: "Brandon Aubrey", team: "DAL", gamesPlayed: 17, fgMade: 38, fgAttempts: 41, fgPct: 92.7, xpMade: 44, points: 158 },
      { rank: 2, player: "Justin Tucker", team: "BAL", gamesPlayed: 17, fgMade: 36, fgAttempts: 40, fgPct: 90.0, xpMade: 41, points: 149 },
      { rank: 3, player: "Harrison Butker", team: "KC", gamesPlayed: 17, fgMade: 35, fgAttempts: 39, fgPct: 89.7, xpMade: 40, points: 145 },
      { rank: 4, player: "Younghoe Koo", team: "ATL", gamesPlayed: 17, fgMade: 34, fgAttempts: 38, fgPct: 89.5, xpMade: 39, points: 141 },
      { rank: 5, player: "Jake Elliott", team: "PHI", gamesPlayed: 17, fgMade: 33, fgAttempts: 37, fgPct: 89.2, xpMade: 42, points: 141 },
    ],
  },
  returning: {
    mainTab: "Special Teams",
    title: "Returning",
    columns: [
      { key: "rank", label: "RK", numeric: true },
      { key: "player", label: "NAME" },
      { key: "position", label: "POS" },
      { key: "gamesPlayed", label: "GP", numeric: true },
      { key: "returns", label: "RET", numeric: true },
      { key: "returnYards", label: "YDS", numeric: true },
      { key: "returnAvg", label: "AVG", numeric: true },
      { key: "touchdowns", label: "TD", numeric: true },
    ],
    rows: [
      { rank: 1, player: "Rashid Shaheed", team: "NO", position: "WR", gamesPlayed: 16, returns: 38, returnYards: 1021, returnAvg: 26.9, touchdowns: 2 },
      { rank: 2, player: "Keisean Nixon", team: "GB", position: "CB", gamesPlayed: 17, returns: 42, returnYards: 987, returnAvg: 23.5, touchdowns: 1 },
      { rank: 3, player: "DeAndre Carter", team: "LV", position: "WR", gamesPlayed: 17, returns: 36, returnYards: 942, returnAvg: 26.2, touchdowns: 1 },
      { rank: 4, player: "Marvin Mims Jr.", team: "DEN", position: "WR", gamesPlayed: 17, returns: 30, returnYards: 861, returnAvg: 28.7, touchdowns: 1 },
      { rank: 5, player: "KaVontae Turpin", team: "DAL", position: "WR", gamesPlayed: 17, returns: 33, returnYards: 852, returnAvg: 25.8, touchdowns: 1 },
    ],
  },
  punting: {
    mainTab: "Special Teams",
    title: "Punting",
    columns: [
      { key: "rank", label: "RK", numeric: true },
      { key: "player", label: "NAME" },
      { key: "team", label: "TEAM" },
      { key: "gamesPlayed", label: "GP", numeric: true },
      { key: "punts", label: "PNT", numeric: true },
      { key: "yards", label: "YDS", numeric: true },
      { key: "average", label: "AVG", numeric: true },
      { key: "inside20", label: "IN20", numeric: true },
    ],
    rows: [
      { rank: 1, player: "AJ Cole", team: "LV", gamesPlayed: 17, punts: 74, yards: 3856, average: 52.1, inside20: 32 },
      { rank: 2, player: "Ryan Stonehouse", team: "TEN", gamesPlayed: 17, punts: 71, yards: 3667, average: 51.6, inside20: 27 },
      { rank: 3, player: "Tommy Townsend", team: "HOU", gamesPlayed: 17, punts: 69, yards: 3526, average: 51.1, inside20: 29 },
      { rank: 4, player: "Michael Dickson", team: "SEA", gamesPlayed: 17, punts: 68, yards: 3444, average: 50.6, inside20: 30 },
      { rank: 5, player: "Bryan Anger", team: "DAL", gamesPlayed: 17, punts: 65, yards: 3250, average: 50.0, inside20: 28 },
    ],
  },
};

const SUB_TABS_BY_MAIN = {
  Offense: ["passing", "rushing", "receiving"],
  Defense: ["tackles", "sacks", "interceptions"],
  Scoring: ["touchdowns"],
  "Special Teams": ["returning", "kicking", "punting"],
};

/**
 * Compact loading spinner used across stats surfaces.
 * @returns {JSX.Element}
 */
function LoadingSpinner() {
  return (
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
  );
}

/**
 * Shared loading panel with spinner and label text.
 * @param {{ label: string }} props Panel props.
 * @returns {JSX.Element}
 */
function LoadingPanel({ label }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
      <LoadingSpinner />
      <span>{label}</span>
    </div>
  );
}

/**
 * Sort stat sheet rows by selected key and direction.
 * @param {Array<Record<string, string | number>>} rows Source rows.
 * @param {string} sortKey Active sort key.
 * @param {"asc" | "desc"} sortDirection Active sort direction.
 * @returns {Array<Record<string, string | number>>} Sorted rows.
 */
const sortStatRows = (rows, sortKey, sortDirection) => {
  const direction = sortDirection === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (typeof av === "number" && typeof bv === "number") {
      return (av - bv) * direction;
    }
    return String(av).localeCompare(String(bv)) * direction;
  });
};

/**
 * Check whether a row should be shown for a conference filter.
 * @param {Record<string, string | number>} row Data row with team code.
 * @param {"All NFL" | "AFC" | "NFC"} conferenceFilter Selected filter.
 * @returns {boolean} True when row passes filter.
 */
const matchesConferenceFilter = (row, conferenceFilter) => {
  if (conferenceFilter === "All NFL") {
    return true;
  }
  if (row.isRetired) {
    return false;
  }
  const teamCode = getPrimaryTeamCode(String(row.team ?? ""));
  const conference = TEAM_CONFERENCE_MAP[teamCode];
  return conference === conferenceFilter;
};

/**
 * Renders one ESPN-style leaders table card.
 * @param {{
 *   title: string,
 *   metricLabel: string,
 *   rows: Array<{rank:number, player:string, team:string, value:string, sleeperId?: string, isRetired?: boolean}>,
 *   onPlayerSelect: (payload: { playerId: number | null, sleeperId: string | null }) => void,
 *   getPlayerIdByName: (playerName: string) => number | null,
 *   onOpenStatSheet: (statType: string) => void
 * }} props Leaders table props
 * @returns {JSX.Element}
 */
function StatLeadersTable({
  title,
  metricLabel,
  rows,
  onPlayerSelect,
  getPlayerIdByName,
  getSleeperIdByName,
  onOpenStatSheet,
}) {
  /**
   * Hide images that fail to load to keep rows aligned.
   * @param {React.SyntheticEvent<HTMLImageElement>} event Image error event.
   * @returns {void}
   */
  const hideBrokenImage = (event) => {
    event.currentTarget.style.display = "none";
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/50">
      <header className="grid grid-cols-[56px_1fr_auto] border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>{title}</span>
        <span />
        <span>{metricLabel}</span>
      </header>
      <ul>
        {rows.map((row) => {
          const resolvedSleeperId =
            row.sleeperId != null
              ? String(row.sleeperId)
              : getSleeperIdByName(row.player);
          const headshotUrl = getPlayerHeadshotUrl(resolvedSleeperId);
          return (
          <li
            key={`${title}-${row.player}`}
            className={`grid grid-cols-[56px_1fr_auto] items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm dark:border-slate-900 ${
              getPlayerIdByName(row.player) != null || resolvedSleeperId != null
                ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60"
                : ""
            }`}
            onClick={() => {
              const playerId = getPlayerIdByName(row.player);
              const sleeperId = resolvedSleeperId;
              if (playerId != null) {
                onPlayerSelect({ playerId, sleeperId: null });
              } else if (sleeperId) {
                onPlayerSelect({ playerId: null, sleeperId });
              }
            }}
          >
            <span className="font-medium text-slate-500 dark:text-slate-400">{row.rank}</span>
            <span className="flex min-w-0 items-center gap-2">
              {headshotUrl ? (
                <img
                  src={headshotUrl}
                  alt={`${row.player} headshot`}
                  className="h-7 w-7 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                  loading="lazy"
                  onError={hideBrokenImage}
                />
              ) : (
                <img
                  src={getPlayerPortraitUrl(row.player)}
                  alt={`${row.player} avatar`}
                  className="h-7 w-7 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                  loading="lazy"
                  onError={hideBrokenImage}
                />
              )}
              {!row.isRetired && row.team ? (
                <img
                  src={getTeamLogoUrl(getPrimaryTeamCode(row.team)) ?? undefined}
                  alt={`${getPrimaryTeamCode(row.team)} logo`}
                  className="h-5 w-5 rounded-sm object-contain"
                  loading="lazy"
                  onError={hideBrokenImage}
                />
              ) : null}
              <span className="min-w-0 truncate font-medium text-blue-600 dark:text-blue-300">
                {row.player}
                <span className="ml-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {statRowTeamLabel(row)}
                </span>
              </span>
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{row.value}</span>
          </li>
          );
        })}
      </ul>
      <div className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={() => onOpenStatSheet(title.toLowerCase())}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          Complete Leaders
        </button>
      </div>
    </article>
  );
}

/**
 * Full player stats table inspired by ESPN player stats view.
 * @param {{
 *   selectedMainTab: string,
 *   onMainTabChange: (next: string) => void,
 *   selectedStatType: string,
 *   onStatTypeChange: (next: string) => void,
 *   season: number,
 *   onSeasonChange: (next: number) => void,
 *   split: string,
 *   onSplitChange: (next: string) => void,
 *   conferenceFilter: "All NFL" | "AFC" | "NFC",
 *   onConferenceFilterChange: (next: "All NFL" | "AFC" | "NFC") => void,
 *   onPlayerSelect: (payload: { playerId: number | null, sleeperId: string | null }) => void,
 *   getPlayerIdByName: (playerName: string) => number | null,
 *   seasonLeadersQuery: import("@tanstack/react-query").UseQueryResult<any, Error>
 * }} props Stats sheet props
 * @returns {JSX.Element}
 */
function PlayerStatsSheet({
  selectedMainTab,
  onMainTabChange,
  selectedStatType,
  onStatTypeChange,
  season,
  onSeasonChange,
  split,
  onSplitChange,
  conferenceFilter,
  onConferenceFilterChange,
  onPlayerSelect,
  getPlayerIdByName,
  getSleeperIdByName,
  seasonLeadersQuery,
}) {
  const [sortKey, setSortKey] = useState("rank");
  const [sortDirection, setSortDirection] = useState("asc");
  const fallbackStatConfig = PLAYER_STATS_SHEET_DATA[selectedStatType];
  const statConfig = {
    ...fallbackStatConfig,
    title: seasonLeadersQuery.data?.title ?? fallbackStatConfig.title,
    columns: seasonLeadersQuery.data?.columns ?? fallbackStatConfig.columns,
    rows: seasonLeadersQuery.data?.rows ?? fallbackStatConfig.rows,
  };
  const availableStatTypes = SUB_TABS_BY_MAIN[selectedMainTab];

  const filteredSortedRows = useMemo(() => {
    const conferenceRows = statConfig.rows.filter((row) =>
      matchesConferenceFilter(row, conferenceFilter),
    );
    return sortStatRows(conferenceRows, sortKey, sortDirection).slice(0, 25);
  }, [conferenceFilter, sortDirection, sortKey, statConfig.rows]);

  /**
   * Toggle sorting for the selected table column.
   * @param {string} nextKey Next column key.
   * @returns {void}
   */
  const handleSort = (nextKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "rank" ? "asc" : "desc");
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
        NFL Player {statConfig.title} Stats {season}
      </h2>

      <div className="mt-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-6">
          {MAIN_STAT_TABS.map((mainTab) => (
            <button
              key={mainTab}
              type="button"
              onClick={() => onMainTabChange(mainTab)}
              className={`border-b-2 pb-2 text-sm font-semibold ${
                selectedMainTab === mainTab
                  ? "border-red-500 text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 dark:text-slate-400"
              }`}
            >
              {mainTab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {availableStatTypes.map((statType) => (
          <button
            key={statType}
            type="button"
            onClick={() => onStatTypeChange(statType)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              selectedStatType === statType
                ? "bg-red-500 text-white"
                : "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"
            }`}
          >
            {PLAYER_STATS_SHEET_DATA[statType].title}
          </button>
        ))}
        <select
          value={season}
          onChange={(event) => onSeasonChange(Number(event.target.value))}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        >
          {getNflSeasonYearOptions().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          value={split}
          onChange={(event) => onSplitChange(event.target.value)}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        >
          {SEASON_SPLITS.map((splitLabel) => (
            <option key={splitLabel} value={splitLabel}>
              {splitLabel}
            </option>
          ))}
        </select>
        <select
          value={conferenceFilter}
          onChange={(event) =>
            onConferenceFilterChange(event.target.value)
          }
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        >
          {CONFERENCE_FILTERS.map((filter) => (
            <option key={filter} value={filter}>
              {filter}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        {seasonLeadersQuery.isLoading || seasonLeadersQuery.isFetching ? (
          <div className="p-6">
            <LoadingPanel label="Loading historical leaders..." />
          </div>
        ) : seasonLeadersQuery.isError ? (
          <p className="px-3 py-2 text-xs text-red-600 dark:text-red-300">
            Could not load selected season leaders from backend.
          </p>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {statConfig.columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-2 py-2 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${
                      column.numeric ? "text-right" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="w-full text-left hover:text-slate-900 dark:hover:text-white"
                    >
                      {column.label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSortedRows.map((row) => (
                <tr
                  key={`${selectedStatType}-${row.rank}-${row.player}`}
                  className={`border-b border-slate-100 text-slate-700 dark:border-slate-900 dark:text-slate-200 ${
                    getPlayerIdByName(String(row.player ?? "")) != null ||
                    (row.sleeperId != null
                      ? String(row.sleeperId)
                      : getSleeperIdByName(String(row.player ?? ""))) != null
                      ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/50"
                      : ""
                  }`}
                  onClick={() => {
                    const playerId = getPlayerIdByName(String(row.player ?? ""));
                    const sleeperId =
                      row.sleeperId != null
                        ? String(row.sleeperId)
                        : getSleeperIdByName(String(row.player ?? ""));
                    if (playerId != null) {
                      onPlayerSelect({ playerId, sleeperId: null });
                    } else if (sleeperId) {
                      onPlayerSelect({ playerId: null, sleeperId });
                    }
                  }}
                >
                  {statConfig.columns.map((column) => {
                    const cellValue = row[column.key];
                    if (column.key === "player") {
                      const sleeperId =
                        row.sleeperId != null
                          ? String(row.sleeperId)
                          : getSleeperIdByName(String(row.player ?? ""));
                      const headshotUrl = getPlayerHeadshotUrl(sleeperId);
                      return (
                        <td key={column.key} className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            {headshotUrl ? (
                              <img
                                src={headshotUrl}
                                alt={`${String(cellValue ?? "Player")} headshot`}
                                className="h-5 w-5 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <img
                                src={getPlayerPortraitUrl(String(cellValue ?? "Player"))}
                                alt={`${String(cellValue ?? "Player")} avatar`}
                                className="h-5 w-5 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                            {!row.isRetired && row.team ? (
                              <img
                                src={getTeamLogoUrl(getPrimaryTeamCode(String(row.team))) ?? undefined}
                                alt={`${getPrimaryTeamCode(String(row.team))} logo`}
                                className="h-4 w-4 object-contain"
                                loading="lazy"
                              />
                            ) : null}
                            <span className="font-semibold text-blue-600 dark:text-blue-300">
                              {String(cellValue ?? "—")}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {statRowTeamLabel(row)}
                            </span>
                          </div>
                        </td>
                      );
                    }
                    if (column.key === "team") {
                      return (
                        <td key={column.key} className="px-2 py-2">
                          {statRowTeamLabel(row)}
                        </td>
                      );
                    }
                    return (
                      <td
                        key={column.key}
                        className={`px-2 py-2 ${column.numeric ? "text-right" : ""}`}
                      >
                        {cellValue != null ? String(cellValue) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/**
 * Renders the ESPN-inspired stats dashboard with all major categories.
 * @returns {JSX.Element}
 */
export default function StatsTab() {
  const [viewMode, setViewMode] = useState("overview");
  const [statsDrawerPlayerId, setStatsDrawerPlayerId] = useState(null);
  const [statsDrawerSleeperId, setStatsDrawerSleeperId] = useState(null);
  const [selectedMainTab, setSelectedMainTab] = useState("Offense");
  const [selectedStatType, setSelectedStatType] = useState("passing");
  const [selectedSeason, setSelectedSeason] = useState(() => getDefaultNflSeasonYear());
  const [selectedSplit, setSelectedSplit] = useState("Regular Season");
  const [selectedConferenceFilter, setSelectedConferenceFilter] = useState("All NFL");

  const playersQuery = useQuery({
    queryKey: ["players", "stats-tab"],
    queryFn: async () => {
      const response = await getAllPlayers();
      return response.data;
    },
  });
  const seasonLeadersQuery = useQuery({
    queryKey: [
      "season-leaders",
      selectedStatType,
      selectedSeason,
      selectedSplit,
      selectedConferenceFilter,
    ],
    queryFn: async () => {
      const splitMap = {
        "Regular Season": "regular",
        Postseason: "postseason",
      };
      const conferenceMap = {
        "All NFL": "all",
        AFC: "afc",
        NFC: "nfc",
      };
      const response = await getSeasonLeaders({
        category: selectedStatType,
        season: selectedSeason,
        split: splitMap[selectedSplit] ?? "regular",
        conference: conferenceMap[selectedConferenceFilter] ?? "all",
      });
      return response.data;
    },
    enabled: viewMode === "sheet",
    retry: false,
  });

  const playerIdByNormalizedName = useMemo(() => {
    const index = new Map();
    (playersQuery.data ?? []).forEach((player) => {
      if (!player?.name || player?.id == null) {
        return;
      }
      const key = normalizeName(player.name);
      if (!index.has(key)) {
        index.set(key, player.id);
      }
    });
    return index;
  }, [playersQuery.data]);
  const sleeperIdByNormalizedName = useMemo(() => {
    const index = new Map();
    (playersQuery.data ?? []).forEach((player) => {
      if (!player?.name || !player?.sleeper_id) {
        return;
      }
      const key = normalizeName(player.name);
      if (!index.has(key)) {
        index.set(key, String(player.sleeper_id));
      }
    });
    return index;
  }, [playersQuery.data]);

  /**
   * Resolve a leaderboard row name to a player id.
   * @param {string} playerName Player full name.
   * @returns {number | null} Player id for drawer lookup.
   */
  const getPlayerIdByName = (playerName) => playerIdByNormalizedName.get(normalizeName(playerName)) ?? null;
  /**
   * Resolve a leaderboard row name to a Sleeper player id.
   * @param {string} playerName Player full name.
   * @returns {string | null} Sleeper id for headshot/profile lookup.
   */
  const getSleeperIdByName = (playerName) =>
    sleeperIdByNormalizedName.get(normalizeName(playerName)) ?? null;

  /**
   * Open the player profile modal from a stats row (DB id preferred, else Sleeper id).
   * @param {{ playerId: number | null, sleeperId: string | null }} payload Selection payload.
   * @returns {void}
   */
  const openStatsPlayerProfile = ({ playerId, sleeperId }) => {
    setStatsDrawerPlayerId(playerId ?? null);
    setStatsDrawerSleeperId(sleeperId ?? null);
  };

  /**
   * Open the detailed stats sheet and focus the requested stat type.
   * @param {string} rawStatType Requested stat identifier from UI.
   * @returns {void}
   */
  const openStatSheet = (rawStatType) => {
    const aliases = {
      passing: "passing",
      rushing: "rushing",
      receiving: "receiving",
      touchdowns: "touchdowns",
      totalyards: "passing",
      downs: "touchdowns",
      tackles: "tackles",
      sacks: "sacks",
      interceptions: "interceptions",
      yardsallowed: "tackles",
      turnovers: "interceptions",
      returning: "returning",
      kicking: "kicking",
      punting: "punting",
    };
    const nextStatType = aliases[rawStatType] ?? "passing";
    const parentTab = PLAYER_STATS_SHEET_DATA[nextStatType]?.mainTab ?? "Offense";
    setSelectedMainTab(parentTab);
    setSelectedStatType(nextStatType);
    setViewMode("sheet");
  };

  /**
   * Switch top stat tab and keep child stat type valid.
   * @param {string} nextMainTab Parent stats tab.
   * @returns {void}
   */
  const handleMainTabChange = (nextMainTab) => {
    setSelectedMainTab(nextMainTab);
    const defaultStatType = SUB_TABS_BY_MAIN[nextMainTab][0];
    setSelectedStatType(defaultStatType);
  };

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      {playersQuery.isLoading || playersQuery.isFetching ? (
        <LoadingPanel label="Loading player index for stats..." />
      ) : null}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setViewMode("overview")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              viewMode === "overview"
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Leaders overview
          </button>
          <button
            type="button"
            onClick={() => setViewMode("sheet")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              viewMode === "sheet"
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Player stats sheet
          </button>
        </div>
      </div>

      {viewMode === "sheet" ? (
        <PlayerStatsSheet
          selectedMainTab={selectedMainTab}
          onMainTabChange={handleMainTabChange}
          selectedStatType={selectedStatType}
          onStatTypeChange={setSelectedStatType}
          season={selectedSeason}
          onSeasonChange={setSelectedSeason}
          split={selectedSplit}
          onSplitChange={setSelectedSplit}
          conferenceFilter={selectedConferenceFilter}
          onConferenceFilterChange={setSelectedConferenceFilter}
          onPlayerSelect={openStatsPlayerProfile}
          getPlayerIdByName={getPlayerIdByName}
          getSleeperIdByName={getSleeperIdByName}
          seasonLeadersQuery={seasonLeadersQuery}
        />
      ) : null}

      {viewMode === "overview" ? (
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            NFL Stat Leaders {getDefaultNflSeasonYear()}
          </h2>
          <button
            type="button"
            onClick={() => openStatSheet("passing")}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Open Full Stats Sheet
          </button>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            {getDefaultNflSeasonYear()} Regular Season
          </button>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-3xl font-semibold text-slate-900 dark:text-white">Offensive Leaders</h3>
            {OFFENSIVE_LEADERS.map((group) => (
              <StatLeadersTable
                key={group.id}
                title={group.title}
                metricLabel={group.metricLabel}
                rows={group.rows}
                onPlayerSelect={openStatsPlayerProfile}
                getPlayerIdByName={getPlayerIdByName}
                getSleeperIdByName={getSleeperIdByName}
                onOpenStatSheet={openStatSheet}
              />
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="text-3xl font-semibold text-slate-900 dark:text-white">Defensive Leaders</h3>
            {DEFENSIVE_LEADERS.map((group) => (
              <StatLeadersTable
                key={group.id}
                title={group.title}
                metricLabel={group.metricLabel}
                rows={group.rows}
                onPlayerSelect={openStatsPlayerProfile}
                getPlayerIdByName={getPlayerIdByName}
                getSleeperIdByName={getSleeperIdByName}
                onOpenStatSheet={openStatSheet}
              />
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          Statistics are updated nightly
        </p>
      </div>
      ) : null}
      <StatsDrawer
        playerId={statsDrawerPlayerId}
        sleeperId={statsDrawerSleeperId}
        onClose={() => {
          setStatsDrawerPlayerId(null);
          setStatsDrawerSleeperId(null);
        }}
      />
    </section>
  );
}
