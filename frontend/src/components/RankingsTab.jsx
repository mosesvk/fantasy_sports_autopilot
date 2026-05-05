import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { getSeasonLeaders } from "../api/client.js";
import { getPlayerHeadshotUrl, getTeamLogoUrl } from "../utils/media.js";
import {
  CHAMPIONSHIP_HISTORY,
  NFL_DIVISIONS_GRID,
  PLAYOFF_BRACKET_2025,
  STANDINGS_BY_DIVISION_2025,
  TEAM_NAMES,
  flattenStandings,
} from "../data/nflRankingsStatic.js";

const STANDINGS_SEASONS = [2025, 2024, 2023, 2022, 2021, 2020];
const SEASON_SPLITS = ["Regular Season", "Postseason"];

/** Categories shown on the Leaders sub-tab (matches backend season-leaders). */
const LEADER_PANELS = [
  { category: "passing", metricKey: "yards", metricLabel: "YDS" },
  { category: "rushing", metricKey: "yards", metricLabel: "YDS" },
  { category: "receiving", metricKey: "yards", metricLabel: "YDS" },
  { category: "tackles", metricKey: "tackles", metricLabel: "TOT" },
  { category: "sacks", metricKey: "sacks", metricLabel: "SACK" },
];

/**
 * @param {number} pct
 * @returns {string}
 */
const formatPct = (pct) => pct.toFixed(3);

/**
 * @param {number} pf
 * @param {number} pa
 * @returns {number}
 */
const pointDiff = (pf, pa) => pf - pa;

/**
 * @param {import("../data/nflRankingsStatic.js").StandingsRow} row
 * @returns {string}
 */
const recordStr = (row) => {
  const t = row.t ?? 0;
  return t ? `${row.w}-${row.l}-${t}` : `${row.w}-${row.l}-0`;
};

/**
 * @param {string} metricKey
 * @param {string | number | null | undefined} raw
 * @returns {string}
 */
const formatLeaderMetric = (metricKey, raw) => {
  if (raw == null || raw === "") return "—";
  const n = Number(raw);
  if (Number.isNaN(n)) return String(raw);
  if (metricKey === "sacks") return n.toFixed(1);
  if (metricKey === "tackles" || metricKey === "yards") return Math.round(n).toLocaleString();
  return String(n);
};

/**
 * Hide broken images cleanly.
 * @param {React.SyntheticEvent<HTMLImageElement>} event
 * @returns {void}
 */
const hideBrokenImage = (event) => {
  event.currentTarget.style.display = "none";
};

/**
 * Single team row inside a playoff game card.
 * @param {{
 *   team: { seed: number, abbr: string, score?: number | null },
 *   won: boolean,
 * }} props
 * @returns {JSX.Element}
 */
function BracketTeamRow({ team, won }) {
  const logo = getTeamLogoUrl(team.abbr);
  const name = TEAM_NAMES[team.abbr] ?? team.abbr;
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs ${
        won ? "bg-slate-100 font-semibold dark:bg-slate-800" : "text-slate-600 dark:text-slate-400"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="w-4 shrink-0 text-center font-bold text-slate-500 dark:text-slate-400">{team.seed}</span>
        {logo ? (
          <img src={logo} alt="" className="h-6 w-6 shrink-0 object-contain" loading="lazy" onError={hideBrokenImage} />
        ) : null}
        <span className="truncate">{name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 font-mono tabular-nums">
        {won ? <span className="text-slate-900 dark:text-white">▶</span> : null}
        <span>{team.score ?? "—"}</span>
      </span>
    </div>
  );
}

/**
 * One playoff matchup card.
 * @param {{
 *   game: import("../data/nflRankingsStatic.js").BracketGame,
 * }} props
 * @returns {JSX.Element}
 */
function BracketMatchupCard({ game }) {
  const homeWon = game.winner === "home";
  const awayWon = game.winner === "away";
  return (
    <div className="min-w-[200px] rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <BracketTeamRow team={game.home} won={homeWon} />
      <BracketTeamRow team={game.away} won={awayWon} />
      {game.status ? (
        <p className="mt-1 text-center text-[10px] font-medium text-slate-400">{game.status}</p>
      ) : null}
    </div>
  );
}

/**
 * #1 seed bye placeholder.
 * @param {{ bye: import("../data/nflRankingsStatic.js").BracketBye }} props
 * @returns {JSX.Element}
 */
function BracketByeCard({ bye }) {
  const logo = getTeamLogoUrl(bye.abbr);
  const name = TEAM_NAMES[bye.abbr] ?? bye.abbr;
  return (
    <div className="min-w-[200px] rounded-lg border border-dashed border-amber-300/80 bg-amber-50/80 p-3 text-xs dark:border-amber-700/50 dark:bg-amber-950/30">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-500">#{bye.seed}</span>
        {logo ? (
          <img src={logo} alt="" className="h-7 w-7 object-contain" loading="lazy" onError={hideBrokenImage} />
        ) : null}
        <span className="font-semibold text-slate-800 dark:text-slate-200">{name}</span>
      </div>
      <p className="mt-2 font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">Bye</p>
      <p className="mt-1 text-[10px] leading-snug text-slate-600 dark:text-slate-400">Will play lowest remaining seed.</p>
    </div>
  );
}

/**
 * Column of games for one round.
 * @param {{ title: string, dates?: string, children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
function BracketRoundColumn({ title, dates, children }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">{title}</p>
        {dates ? <p className="text-[10px] text-slate-500 dark:text-slate-400">{dates}</p> : null}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

/**
 * Conference side of the bracket (AFC left-to-right, NFC mirrored).
 * @param {{
 *   label: string,
 *   side: typeof PLAYOFF_BRACKET_2025.afc,
 *   reverse?: boolean,
 * }} props
 * @returns {JSX.Element}
 */
function ConferenceBracketSide({ label, side, reverse = false }) {
  const { rounds } = PLAYOFF_BRACKET_2025;
  const inner = (
    <>
      <BracketRoundColumn title={rounds.wildCard.label} dates={rounds.wildCard.dates}>
        {side.byes.map((b) => (
          <BracketByeCard key={`bye-${b.abbr}`} bye={b} />
        ))}
        {side.wildCard.map((g, i) => (
          <BracketMatchupCard key={`wc-${i}`} game={g} />
        ))}
      </BracketRoundColumn>
      <BracketRoundColumn title={rounds.divisional.label} dates={rounds.divisional.dates}>
        {side.divisional.map((g, i) => (
          <BracketMatchupCard key={`div-${i}`} game={g} />
        ))}
      </BracketRoundColumn>
      <BracketRoundColumn title={rounds.conference.label} dates={rounds.conference.dates}>
        <BracketMatchupCard game={side.championship} />
      </BracketRoundColumn>
    </>
  );
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
        {label}
      </h3>
      <div className={`flex flex-wrap items-start justify-center gap-3 ${reverse ? "flex-row-reverse" : "flex-row"}`}>
        {inner}
      </div>
    </div>
  );
}

/**
 * Center Super Bowl card + champion banner.
 * @returns {JSX.Element}
 */
function SuperBowlCenter() {
  const sb = PLAYOFF_BRACKET_2025.superBowl;
  const homeWon = sb.winner === "home";
  const awayWon = sb.winner === "away";
  const champAbbr = homeWon ? sb.home.abbr : sb.away.abbr;
  const champLogo = getTeamLogoUrl(champAbbr);
  return (
    <div className="flex w-full max-w-[260px] flex-col items-center gap-3 self-start">
      <div className="w-full rounded-xl border border-slate-200 bg-white p-3 text-center shadow-md dark:border-slate-700 dark:bg-slate-900/90">
        <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{sb.title}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{sb.location}</p>
        <p className="mt-1 text-[10px] font-medium text-slate-400">{PLAYOFF_BRACKET_2025.rounds.superBowl.dates}</p>
        <div className="mt-3 space-y-1 text-left">
          <BracketTeamRow team={sb.away} won={awayWon} />
          <BracketTeamRow team={sb.home} won={homeWon} />
        </div>
        <p className="mt-2 text-[10px] text-slate-400">{sb.status}</p>
      </div>
      <div className="w-full rounded-lg bg-slate-900 px-3 py-4 text-center text-white shadow-lg dark:bg-slate-950">
        {champLogo ? (
          <img src={champLogo} alt="" className="mx-auto mb-2 h-12 w-12 object-contain" loading="lazy" onError={hideBrokenImage} />
        ) : null}
        <p className="text-2xl font-black tracking-tight">{sb.championBanner.year}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Super Bowl Champions</p>
        <p className="mt-1 text-sm font-bold">{TEAM_NAMES[champAbbr] ?? champAbbr}</p>
      </div>
    </div>
  );
}

/**
 * Division or conference standings table.
 * @param {{
 *   title: string,
 *   rows: Array<import("../data/nflRankingsStatic.js").StandingsRow>,
 *   emphasizeDiv?: boolean,
 * }} props
 * @returns {JSX.Element}
 */
function StandingsDivisionTable({ title, rows, emphasizeDiv = false }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/50">
      <table className="min-w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
            <th colSpan={13} className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
              {title}
            </th>
          </tr>
          <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th className="px-2 py-1.5">Team</th>
            <th className="px-1 py-1.5 text-center">W</th>
            <th className="px-1 py-1.5 text-center">L</th>
            <th className="px-1 py-1.5 text-center">T</th>
            <th className="bg-sky-50 px-1 py-1.5 text-center dark:bg-sky-950/40">PCT</th>
            <th className="px-1 py-1.5 text-center">HOME</th>
            <th className="px-1 py-1.5 text-center">AWAY</th>
            <th className={`px-1 py-1.5 text-center ${emphasizeDiv ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}>DIV</th>
            <th className="px-1 py-1.5 text-center">CONF</th>
            <th className="px-1 py-1.5 text-center">PF</th>
            <th className="px-1 py-1.5 text-center">PA</th>
            <th className="px-1 py-1.5 text-center">DIFF</th>
            <th className="px-1 py-1.5 text-center">STRK</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const diff = pointDiff(row.pf, row.pa);
            const logo = getTeamLogoUrl(row.abbr);
            const t = row.t ?? 0;
            return (
              <tr key={row.abbr} className="border-b border-slate-100 dark:border-slate-900">
                <td className="px-2 py-1.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {row.status ? (
                      <span className="w-4 shrink-0 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {row.status} --
                      </span>
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    {logo ? (
                      <img src={logo} alt="" className="h-5 w-5 shrink-0 object-contain" loading="lazy" onError={hideBrokenImage} />
                    ) : null}
                    <button
                      type="button"
                      className="truncate text-left font-semibold text-blue-600 hover:underline dark:text-blue-300"
                    >
                      {TEAM_NAMES[row.abbr] ?? row.abbr}
                    </button>
                  </div>
                </td>
                <td className="px-1 py-1.5 text-center tabular-nums">{row.w}</td>
                <td className="px-1 py-1.5 text-center tabular-nums">{row.l}</td>
                <td className="px-1 py-1.5 text-center tabular-nums">{t}</td>
                <td className="bg-sky-50 px-1 py-1.5 text-center tabular-nums dark:bg-sky-950/40">{formatPct(row.pct)}</td>
                <td className="px-1 py-1.5 text-center tabular-nums text-slate-600 dark:text-slate-400">{row.home}</td>
                <td className="px-1 py-1.5 text-center tabular-nums text-slate-600 dark:text-slate-400">{row.away}</td>
                <td
                  className={`px-1 py-1.5 text-center tabular-nums text-slate-600 dark:text-slate-400 ${
                    emphasizeDiv ? "bg-amber-50 font-semibold dark:bg-amber-950/30" : ""
                  }`}
                >
                  {row.div}
                </td>
                <td className="px-1 py-1.5 text-center tabular-nums text-slate-600 dark:text-slate-400">{row.conf}</td>
                <td className="px-1 py-1.5 text-center tabular-nums">{row.pf}</td>
                <td className="px-1 py-1.5 text-center tabular-nums">{row.pa}</td>
                <td
                  className={`px-1 py-1.5 text-center font-semibold tabular-nums ${
                    diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {diff > 0 ? `+${diff}` : String(diff)}
                </td>
                <td className="px-1 py-1.5 text-center tabular-nums text-slate-600 dark:text-slate-400">{row.strk}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Expanded standings: all teams in one table.
 * @param {{
 *   rows: Array<import("../data/nflRankingsStatic.js").StandingsRow & { division: string, conference: string }>,
 * }} props
 * @returns {JSX.Element}
 */
function ExpandedStandingsTable({ rows }) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.pct - a.pct || pointDiff(b.pf, b.pa) - pointDiff(a.pf, a.pa)),
    [rows],
  );
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/50">
      <table className="min-w-full text-left text-[11px]">
        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
          <tr className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
            <th className="px-2 py-2">#</th>
            <th className="px-2 py-2">Team</th>
            <th className="px-2 py-2">Conf</th>
            <th className="px-2 py-2">Div</th>
            <th className="px-2 py-2 text-center">Rec</th>
            <th className="bg-sky-50 px-2 py-2 text-center dark:bg-sky-950/40">PCT</th>
            <th className="px-2 py-2 text-center">DIFF</th>
            <th className="px-2 py-2 text-center">STRK</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => {
            const diff = pointDiff(row.pf, row.pa);
            const logo = getTeamLogoUrl(row.abbr);
            return (
              <tr key={`${row.conference}-${row.abbr}`} className="border-b border-slate-100 dark:border-slate-900">
                <td className="px-2 py-1.5 tabular-nums text-slate-500">{idx + 1}</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    {logo ? (
                      <img src={logo} alt="" className="h-5 w-5 object-contain" loading="lazy" onError={hideBrokenImage} />
                    ) : null}
                    <span className="font-semibold text-blue-600 dark:text-blue-300">{TEAM_NAMES[row.abbr] ?? row.abbr}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">{row.conference}</td>
                <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">{row.division.replace(/^(AFC|NFC)\s+/, "")}</td>
                <td className="px-2 py-1.5 text-center tabular-nums">{recordStr(row)}</td>
                <td className="bg-sky-50 px-2 py-1.5 text-center tabular-nums dark:bg-sky-950/40">{formatPct(row.pct)}</td>
                <td
                  className={`px-2 py-1.5 text-center font-semibold tabular-nums ${
                    diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {diff > 0 ? `+${diff}` : String(diff)}
                </td>
                <td className="px-2 py-1.5 text-center tabular-nums text-slate-600 dark:text-slate-400">{row.strk}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * League overview: teams by division with logos.
 * @returns {JSX.Element}
 */
function LeagueOverviewGrid() {
  return (
    <div className="space-y-8">
      {NFL_DIVISIONS_GRID.map((block) => (
        <div key={block.conference}>
          <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">{block.conference}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {block.divisions.map((div) => (
              <div
                key={div.label}
                className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70"
              >
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  {div.label}
                </p>
                <ul className="space-y-2">
                  {div.teams.map((abbr) => {
                    const logo = getTeamLogoUrl(abbr);
                    return (
                      <li key={abbr} className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                        {logo ? (
                          <img src={logo} alt="" className="h-6 w-6 shrink-0 object-contain" loading="lazy" onError={hideBrokenImage} />
                        ) : null}
                        <span>{TEAM_NAMES[abbr] ?? abbr}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Championship history cards with logos.
 * @returns {JSX.Element}
 */
function ChampionsHistory() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {CHAMPIONSHIP_HISTORY.map((entry) => {
        const champLogo = getTeamLogoUrl(entry.championAbbr);
        const ruLogo = getTeamLogoUrl(entry.runnerUpAbbr);
        return (
          <article
            key={entry.season}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Season {entry.season}</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Champion
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800/70 dark:bg-emerald-950/40">
              {champLogo ? (
                <img src={champLogo} alt="" className="h-10 w-10 object-contain" loading="lazy" onError={hideBrokenImage} />
              ) : null}
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{entry.champion}</span>
            </div>
            <div className="my-2 h-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              {ruLogo ? (
                <img src={ruLogo} alt="" className="h-9 w-9 object-contain" loading="lazy" onError={hideBrokenImage} />
              ) : null}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Runner-up: {entry.runnerUp}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/**
 * Stat leaders panels (live from API when available).
 * @param {{ season: number }} props
 * @returns {JSX.Element}
 */
function RankingsLeadersSection({ season }) {
  const leaderQueries = useQueries({
    queries: LEADER_PANELS.map((panel) => ({
      queryKey: ["rankings-leaders", panel.category, season],
      queryFn: async () => {
        const res = await getSeasonLeaders({
          category: panel.category,
          season,
          split: "regular",
          conference: "all",
        });
        return res.data;
      },
      retry: false,
    })),
  });

  const anyLoading = leaderQueries.some((q) => q.isLoading || q.isFetching);
  const anyError = leaderQueries.some((q) => q.isError);

  return (
    <div className="space-y-4">
      {anyLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading season leaders…</p>
      ) : null}
      {anyError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Some leader categories could not be loaded. Check the API or Sleeper stats availability.
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {LEADER_PANELS.map((panel, index) => {
          const query = leaderQueries[index];
          const rows = (query.data?.rows ?? []).slice(0, 5);
          const title = query.data?.title ?? panel.category;
          return (
            <div
              key={panel.category}
              className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/50"
            >
              <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">{title}</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{panel.metricLabel}</span>
              </header>
              <ul>
                {rows.length === 0 && !query.isLoading ? (
                  <li className="px-3 py-4 text-center text-xs text-slate-500">No data for this season.</li>
                ) : (
                  rows.map((row) => {
                    const sid = row.sleeperId != null ? String(row.sleeperId) : null;
                    const headshot = getPlayerHeadshotUrl(sid);
                    const team = row.team != null ? String(row.team) : "";
                    const teamLogo = team ? getTeamLogoUrl(team.split("/")[0]) : null;
                    const metricVal = formatLeaderMetric(panel.metricKey, row[panel.metricKey]);
                    return (
                      <li
                        key={`${panel.category}-${row.rank}-${row.player}`}
                        className="grid grid-cols-[28px_1fr_auto] items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 dark:border-slate-900"
                      >
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{row.rank}</span>
                        <span className="flex min-w-0 items-center gap-2">
                          {headshot ? (
                            <img
                              src={headshot}
                              alt=""
                              className="h-7 w-7 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                              loading="lazy"
                              onError={hideBrokenImage}
                            />
                          ) : null}
                          {teamLogo ? (
                            <img src={teamLogo} alt="" className="h-5 w-5 object-contain" loading="lazy" onError={hideBrokenImage} />
                          ) : null}
                          <span className="min-w-0 truncate font-medium text-blue-600 dark:text-blue-300">
                            {String(row.player ?? "—")}
                            <span className="ml-1 text-xs font-normal text-slate-400">{team || "—"}</span>
                          </span>
                        </span>
                        <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">{metricVal}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Full rankings hub: standings, playoff bracket, league grid, champions, leaders.
 * @returns {JSX.Element}
 */
export default function RankingsTab() {
  const [mainSection, setMainSection] = useState("standings");
  const [standingsTab, setStandingsTab] = useState("standings");
  const [standingsView, setStandingsView] = useState("division");
  const [standingsSeason, setStandingsSeason] = useState(2025);
  const [standingsSplit, setStandingsSplit] = useState("Regular Season");
  const [bracketSeason, setBracketSeason] = useState(2025);
  const [leadersSeason, setLeadersSeason] = useState(2025);

  const flatStandings = useMemo(() => flattenStandings(STANDINGS_BY_DIVISION_2025), []);

  const standingsDataAvailable = standingsSeason === 2025 && standingsSplit === "Regular Season";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {(
          [
            ["standings", "Standings"],
            ["playoff", "Playoff"],
            ["league", "League"],
            ["champions", "Champions"],
            ["leaders", "Leaders"],
          ]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMainSection(id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              mainSection === id
                ? "bg-red-600 text-white shadow-sm dark:bg-red-500"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mainSection === "standings" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            {(
              [
                ["standings", "Standings"],
                ["expanded", "Expanded"],
                ["vsdiv", "Vs. Division"],
              ]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStandingsTab(id)}
                className={`border-b-2 pb-2 text-xs font-semibold ${
                  standingsTab === id
                    ? "border-red-600 text-slate-900 dark:border-red-500 dark:text-white"
                    : "border-transparent text-slate-500 dark:text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(["league", "conference", "division"]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setStandingsView(v)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  standingsView === v
                    ? "border-2 border-red-600 text-slate-900 dark:border-red-500 dark:text-white"
                    : "border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"
                }`}
              >
                {v}
              </button>
            ))}
            <select
              value={standingsSeason}
              onChange={(e) => setStandingsSeason(Number(e.target.value))}
              className="ml-auto rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200"
            >
              {STANDINGS_SEASONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={standingsSplit}
              onChange={(e) => setStandingsSplit(e.target.value)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200"
            >
              {SEASON_SPLITS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {!standingsDataAvailable ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Demo division standings are available for <strong>2025 · Regular Season</strong>. Other selections show this message until
              live standings are wired to the API.
            </p>
          ) : standingsTab === "expanded" ? (
            <ExpandedStandingsTable rows={flatStandings} />
          ) : standingsView === "league" ? (
            <ExpandedStandingsTable rows={flatStandings} />
          ) : (
            <div className="space-y-8">
              {(["AFC", "NFC"]).map((conf) => (
                <div key={conf}>
                  <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
                    {conf === "AFC" ? "American Football Conference" : "National Football Conference"}
                  </h3>
                  {standingsView === "conference" ? (
                    <ExpandedStandingsTable rows={flatStandings.filter((r) => r.conference === conf)} />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {Object.entries(STANDINGS_BY_DIVISION_2025[conf]).map(([divTitle, rows]) => (
                        <StandingsDivisionTable
                          key={divTitle}
                          title={divTitle}
                          rows={rows}
                          emphasizeDiv={standingsTab === "vsdiv"}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {mainSection === "playoff" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">NFL Playoff Bracket {bracketSeason}</h2>
            <select
              value={bracketSeason}
              onChange={(e) => setBracketSeason(Number(e.target.value))}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              {STANDINGS_SEASONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {bracketSeason === PLAYOFF_BRACKET_2025.season ? (
            <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-center">
              <ConferenceBracketSide label="AFC" side={PLAYOFF_BRACKET_2025.afc} />
              <SuperBowlCenter />
              <ConferenceBracketSide label="NFC" side={PLAYOFF_BRACKET_2025.nfc} reverse />
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Demo bracket is available for <strong>2025</strong>. Select 2025 above to view the full bracket layout.
            </p>
          )}
        </div>
      ) : null}

      {mainSection === "league" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">NFL teams by division</h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">All 32 teams with conference and division alignment.</p>
          <LeagueOverviewGrid />
        </div>
      ) : null}

      {mainSection === "champions" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">NFL Championship Rankings</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Previous seasons with title winners and runners-up.</p>
          </div>
          <ChampionsHistory />
          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Statistics and history panels can be connected to live data when available.</p>
        </div>
      ) : null}

      {mainSection === "leaders" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Season stat leaders</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Top performers from your Sleeper-backed season aggregates.</p>
            </div>
            <select
              value={leadersSeason}
              onChange={(e) => setLeadersSeason(Number(e.target.value))}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200"
            >
              {STANDINGS_SEASONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <RankingsLeadersSection season={leadersSeason} />
        </div>
      ) : null}
    </section>
  );
}
