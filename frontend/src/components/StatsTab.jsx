import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllPlayers } from "../api/client.js";
import StatsDrawer from "./StatsDrawer.jsx";
import { getTeamLogoUrl } from "../utils/media.js";

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
 * Normalize player names so stat-table rows can map to API players.
 * @param {string} value Raw player name.
 * @returns {string} Normalized name key.
 */
const normalizeName = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

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

const PLAYER_STATISTICS = {
  offense: ["Passing", "Rushing", "Receiving", "Touchdowns"],
  defense: ["Tackles", "Sacks", "Interceptions"],
  specialTeams: ["Returning", "Kicking", "Punting"],
};

const TEAM_STATISTICS = {
  offense: ["Total Yards", "Passing", "Rushing", "Receiving", "Downs"],
  defense: ["Yards Allowed", "Turnovers", "Passing", "Receiving", "Downs"],
  specialTeams: ["Returning", "Kicking", "Punting"],
};

/**
 * Renders one ESPN-style leaders table card.
 * @param {{
 *   title: string,
 *   metricLabel: string,
 *   rows: Array<{rank:number, player:string, team:string, value:string}>,
 *   onPlayerSelect: (playerId: number) => void,
 *   getPlayerIdByName: (playerName: string) => number | null
 * }} props Leaders table props
 * @returns {JSX.Element}
 */
function StatLeadersTable({ title, metricLabel, rows, onPlayerSelect, getPlayerIdByName }) {
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
        {rows.map((row) => (
          <li
            key={`${title}-${row.player}`}
            className={`grid grid-cols-[56px_1fr_auto] items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm dark:border-slate-900 ${
              getPlayerIdByName(row.player) != null ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60" : ""
            }`}
            onClick={() => {
              const playerId = getPlayerIdByName(row.player);
              if (playerId != null) {
                onPlayerSelect(playerId);
              }
            }}
          >
            <span className="font-medium text-slate-500 dark:text-slate-400">{row.rank}</span>
            <span className="flex min-w-0 items-center gap-2">
              <img
                src={getPlayerPortraitUrl(row.player)}
                alt={`${row.player} avatar`}
                className="h-7 w-7 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                loading="lazy"
                onError={hideBrokenImage}
              />
              <img
                src={getTeamLogoUrl(getPrimaryTeamCode(row.team)) ?? undefined}
                alt={`${getPrimaryTeamCode(row.team)} logo`}
                className="h-5 w-5 rounded-sm object-contain"
                loading="lazy"
                onError={hideBrokenImage}
              />
              <span className="min-w-0 truncate font-medium text-blue-600 dark:text-blue-300">
                {row.player}
                <span className="ml-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {row.team}
                </span>
              </span>
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{row.value}</span>
          </li>
        ))}
      </ul>
      <div className="px-3 py-2 text-center">
        <button
          type="button"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          Complete Leaders
        </button>
      </div>
    </article>
  );
}

/**
 * Renders a grouped list of stat links.
 * @param {{ title: string, sections: { offense: string[], defense: string[], specialTeams: string[] } }} props Section props
 * @returns {JSX.Element}
 */
function StatsLinkSection({ title, sections }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <div>
          <h4 className="mb-2 border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Offense
          </h4>
          <ul className="space-y-1 text-blue-600 dark:text-blue-300">
            {sections.offense.map((item) => (
              <li key={`${title}-offense-${item}`}>
                <button type="button" className="text-sm font-semibold hover:underline">
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Defense
          </h4>
          <ul className="space-y-1 text-blue-600 dark:text-blue-300">
            {sections.defense.map((item) => (
              <li key={`${title}-defense-${item}`}>
                <button type="button" className="text-sm font-semibold hover:underline">
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Special Teams
          </h4>
          <ul className="space-y-1 text-blue-600 dark:text-blue-300">
            {sections.specialTeams.map((item) => (
              <li key={`${title}-special-${item}`}>
                <button type="button" className="text-sm font-semibold hover:underline">
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the ESPN-inspired stats dashboard with all major categories.
 * @returns {JSX.Element}
 */
export default function StatsTab() {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const playersQuery = useQuery({
    queryKey: ["players", "stats-tab"],
    queryFn: async () => {
      const response = await getAllPlayers();
      return response.data;
    },
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

  /**
   * Resolve a leaderboard row name to a player id.
   * @param {string} playerName Player full name.
   * @returns {number | null} Player id for drawer lookup.
   */
  const getPlayerIdByName = (playerName) => playerIdByNormalizedName.get(normalizeName(playerName)) ?? null;

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            NFL Stat Leaders 2025
          </h2>
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Team Statistics
          </button>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            2025 Regular Season
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
                onPlayerSelect={setSelectedPlayerId}
                getPlayerIdByName={getPlayerIdByName}
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
                onPlayerSelect={setSelectedPlayerId}
                getPlayerIdByName={getPlayerIdByName}
              />
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          Statistics are updated nightly
        </p>
      </div>

      <StatsLinkSection title="Player Statistics" sections={PLAYER_STATISTICS} />
      <StatsLinkSection title="Team Statistics" sections={TEAM_STATISTICS} />
      <StatsDrawer playerId={selectedPlayerId} onClose={() => setSelectedPlayerId(null)} />
    </section>
  );
}
