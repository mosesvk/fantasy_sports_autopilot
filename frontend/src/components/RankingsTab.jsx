import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNflChampionships, getNflStandings } from "../api/client.js";
import { NFL_DIVISIONS_GRID, TEAM_NAMES } from "../data/nflRankingsStatic.js";
import { getNflSeasonYearOptions } from "../utils/nflSeasons.js";
import LoadingPanel from "./LoadingPanel.jsx";
import { getPlayerHeadshotUrl, getTeamLogoUrl } from "../utils/media.js";

const STANDINGS_SEASONS = getNflSeasonYearOptions();
const SEASON_SPLITS = ["Regular Season", "Postseason"];

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
 * Hide broken images cleanly.
 * @param {React.SyntheticEvent<HTMLImageElement>} event
 * @returns {void}
 */
const hideBrokenImage = (event) => {
  event.currentTarget.style.display = "none";
};

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
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const as = a.playoff_seed ?? 99;
      const bs = b.playoff_seed ?? 99;
      if (as !== bs) return as - bs;
      return b.pct - a.pct || pointDiff(b.pf, b.pa) - pointDiff(a.pf, a.pa);
    });
    return copy;
  }, [rows]);
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
 * Championship history cards with logos (API rows: snake_case from FastAPI).
 * @param {{ seasons: Array<Record<string, unknown>>, loading: boolean }} props
 * @returns {JSX.Element}
 */
function ChampionsHistory({ seasons, loading }) {
  if (loading) {
    return <LoadingPanel label="Loading champions…" />;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {seasons.map((entry) => {
        const champAbbr = entry.champion_abbr ?? entry.championAbbr;
        const ruAbbr = entry.runner_up_abbr ?? entry.runnerUpAbbr;
        const champLogo = getTeamLogoUrl(champAbbr);
        const ruLogo = getTeamLogoUrl(ruAbbr);
        const runnerName = entry.runner_up ?? entry.runnerUp;
        const src = entry.source === "espn" ? "Live (ESPN)" : "Verified";
        return (
          <article
            key={entry.season}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Season {entry.season}</span>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  Champion
                </span>
                <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  {src}
                </span>
              </div>
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Runner-up: {runnerName}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/**
 * Full rankings hub: live standings, postseason field, league grid, champions.
 * @returns {JSX.Element}
 */
export default function RankingsTab() {
  const defaultSeason = STANDINGS_SEASONS[0] ?? new Date().getFullYear();
  const [mainSection, setMainSection] = useState("standings");
  const [standingsTab, setStandingsTab] = useState("standings");
  const [standingsView, setStandingsView] = useState("division");
  const [standingsSeason, setStandingsSeason] = useState(defaultSeason);
  const [standingsSplit, setStandingsSplit] = useState("Regular Season");
  const [bracketSeason, setBracketSeason] = useState(defaultSeason);

  const standingsSeasontype = standingsSplit === "Regular Season" ? 2 : 3;

  const standingsQuery = useQuery({
    queryKey: ["nfl-standings", standingsSeason, standingsSeasontype],
    queryFn: async () => {
      const res = await getNflStandings(standingsSeason, standingsSeasontype);
      return res.data;
    },
    enabled: mainSection === "standings",
    retry: 1,
  });

  const playoffQuery = useQuery({
    queryKey: ["nfl-standings", bracketSeason, 3],
    queryFn: async () => {
      const res = await getNflStandings(bracketSeason, 3);
      return res.data;
    },
    enabled: mainSection === "playoff",
    retry: 1,
  });

  const championsQuery = useQuery({
    queryKey: ["nfl-championships"],
    queryFn: async () => {
      const res = await getNflChampionships();
      return res.data;
    },
    enabled: mainSection === "champions",
    retry: 1,
  });

  const entries = standingsQuery.data?.entries ?? [];

  const divisionGroups = useMemo(() => {
    const acc = { AFC: {}, NFC: {} };
    for (const row of entries) {
      const c = row.conference;
      const d = row.division || "Other";
      if (!acc[c]) continue;
      if (!acc[c][d]) acc[c][d] = [];
      acc[c][d].push(row);
    }
    for (const conf of Object.keys(acc)) {
      for (const div of Object.keys(acc[conf])) {
        acc[conf][div].sort((a, b) => b.pct - a.pct || pointDiff(b.pf, b.pa) - pointDiff(a.pf, a.pa));
      }
    }
    return acc;
  }, [entries]);

  const busyStandings = standingsQuery.isPending || standingsQuery.isFetching;
  const busyPlayoff = playoffQuery.isPending || playoffQuery.isFetching;
  const playoffEntries = playoffQuery.data?.entries ?? [];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {(
          [
            ["standings", "Standings"],
            ["playoff", "Playoff"],
            ["league", "League"],
            ["champions", "Champions"],
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

          {standingsQuery.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {standingsQuery.error?.response?.data?.detail || standingsQuery.error?.message || "Could not load standings."}
            </p>
          ) : null}
          {busyStandings ? (
            <LoadingPanel label="Loading standings…" />
          ) : standingsTab === "expanded" ? (
            <ExpandedStandingsTable rows={entries} />
          ) : standingsView === "league" ? (
            <ExpandedStandingsTable rows={entries} />
          ) : (
            <div className="space-y-8">
              {(["AFC", "NFC"]).map((conf) => (
                <div key={conf}>
                  <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
                    {conf === "AFC" ? "American Football Conference" : "National Football Conference"}
                  </h3>
                  {standingsView === "conference" ? (
                    <ExpandedStandingsTable rows={entries.filter((r) => r.conference === conf)} />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {Object.entries(divisionGroups[conf] || {}).map(([divTitle, rows]) => (
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">NFL postseason field {bracketSeason}</h2>
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
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Live playoff qualifiers and seeds from ESPN postseason standings for the selected league year.
          </p>
          {playoffQuery.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {playoffQuery.error?.response?.data?.detail || playoffQuery.error?.message || "Could not load playoff standings."}
            </p>
          ) : null}
          {busyPlayoff ? (
            <LoadingPanel label="Loading playoff standings…" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">AFC</h3>
                <ExpandedStandingsTable rows={playoffEntries.filter((r) => r.conference === "AFC")} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">NFC</h3>
                <ExpandedStandingsTable rows={playoffEntries.filter((r) => r.conference === "NFC")} />
              </div>
            </div>
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Super Bowl results from {STANDINGS_SEASONS[STANDINGS_SEASONS.length - 1]} through {STANDINGS_SEASONS[0]} (ESPN when available,
              otherwise verified).
            </p>
          </div>
          {championsQuery.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {championsQuery.error?.response?.data?.detail || championsQuery.error?.message || "Could not load championships."}
            </p>
          ) : null}
          <ChampionsHistory seasons={championsQuery.data?.seasons ?? []} loading={championsQuery.isPending || championsQuery.isFetching} />
        </div>
      ) : null}
    </section>
  );
}
