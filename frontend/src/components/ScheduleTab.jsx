import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNflScoreboard, getNflTeamSchedule } from "../api/client.js";
import { ALL_TEAM_ABBRS } from "../data/nflScoresScheduleStatic.js";
import { TEAM_NAMES } from "../data/nflRankingsStatic.js";
import { getNflSeasonYearOptions } from "../utils/nflSeasons.js";
import { getTeamLogoUrl } from "../utils/media.js";
import LoadingPanel from "./LoadingPanel.jsx";

const SEASON_OPTIONS = getNflSeasonYearOptions();
const DEFAULT_SEASON = SEASON_OPTIONS[0] ?? new Date().getFullYear();

/**
 * Hide broken logo images.
 * @param {React.SyntheticEvent<HTMLImageElement>} event
 * @returns {void}
 */
const hideBrokenImage = (event) => {
  event.currentTarget.style.display = "none";
};

/**
 * Map scoreboard API days to league schedule table rows.
 * @param {Array<{ date_label: string, games: unknown[] }>} days
 * @returns {Array<{ dateLabel: string, rows: unknown[] }>}
 */
function scoreboardToLeagueDays(days) {
  return (days ?? []).map((day) => ({
    dateLabel: day.date_label,
    rows: (day.games ?? []).map((g) => {
      const away = g.away;
      const home = g.home;
      const awayWon = away.score.total > home.score.total;
      const finalish = !String(g.status || "").toLowerCase().includes("scheduled");
      const resultLabel = finalish
        ? awayWon
          ? `${away.abbr} ${away.score.total}, ${home.abbr} ${home.score.total}`
          : `${home.abbr} ${home.score.total}, ${away.abbr} ${away.score.total}`
        : g.status || "—";
      const perf = g.performers ?? {};
      return {
        awayAbbr: away.abbr,
        homeAbbr: home.abbr,
        resultLabel,
        passLeader: perf.passing?.detail ?? "—",
        rushLeader: perf.rushing?.detail ?? "—",
        recLeader: perf.receiving?.detail ?? "—",
      };
    }),
  }));
}

/**
 * Chevron for week navigation.
 * @param {{ direction: "left" | "right" }} props
 * @returns {JSX.Element}
 */
function ChevronIcon({ direction }) {
  const rotate = direction === "left" ? "" : "rotate-180";
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-4 w-4 ${rotate}`} aria-hidden="true">
      <path
        d="M15 6L9 12L15 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Calendar icon beside week rail.
 * @returns {JSX.Element}
 */
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Matchup cell: away @ home with logos.
 * @param {{ awayAbbr: string, homeAbbr: string }} props
 * @returns {JSX.Element}
 */
function MatchupCell({ awayAbbr, homeAbbr }) {
  const awayLogo = getTeamLogoUrl(awayAbbr);
  const homeLogo = getTeamLogoUrl(homeAbbr);
  const awayName = TEAM_NAMES[awayAbbr] ?? awayAbbr;
  const homeName = TEAM_NAMES[homeAbbr] ?? homeAbbr;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5">
        {awayLogo ? (
          <img src={awayLogo} alt="" className="h-6 w-6 object-contain" loading="lazy" onError={hideBrokenImage} />
        ) : null}
        <span className="font-medium text-blue-600 dark:text-blue-400">{awayName}</span>
      </span>
      <span className="text-slate-400">@</span>
      <span className="inline-flex items-center gap-1.5">
        {homeLogo ? (
          <img src={homeLogo} alt="" className="h-6 w-6 object-contain" loading="lazy" onError={hideBrokenImage} />
        ) : null}
        <span className="font-medium text-blue-600 dark:text-blue-400">{homeName}</span>
      </span>
    </div>
  );
}

/**
 * Stat cell: tries to split "Name 123" for styling.
 * @param {{ text: string }} props
 * @returns {JSX.Element}
 */
function LeaderCell({ text }) {
  if (!text || text === "—") return <span className="text-slate-500">—</span>;
  const parts = text.trim().split(" ");
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(" ");
  const looksNumeric = /^[\d.,]+$/.test(last);
  if (!looksNumeric) {
    return <span className="text-slate-700 dark:text-slate-300">{text}</span>;
  }
  return (
    <>
      <span className="text-blue-600 dark:text-blue-400">{rest}</span>{" "}
      <span className="text-slate-600 dark:text-slate-400">{last}</span>
    </>
  );
}

/**
 * League schedule table for one day.
 * @param {{ day: { dateLabel: string, rows: unknown[] } }} props
 * @returns {JSX.Element}
 */
function LeagueDayTable({ day }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{day.dateLabel}</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
              <th className="px-4 py-2">Matchup</th>
              <th className="px-4 py-2">Result</th>
              <th className="px-4 py-2">Passing leader</th>
              <th className="px-4 py-2">Rushing leader</th>
              <th className="px-4 py-2">Receiving leader</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {day.rows.map((row) => (
              <tr key={`${row.awayAbbr}-${row.homeAbbr}`} className="bg-white dark:bg-slate-950/40">
                <td className="px-4 py-3 align-middle">
                  <MatchupCell awayAbbr={row.awayAbbr} homeAbbr={row.homeAbbr} />
                </td>
                <td className="px-4 py-3 align-middle text-blue-600 dark:text-blue-400">{row.resultLabel}</td>
                <td className="px-4 py-3 align-middle">
                  <LeaderCell text={row.passLeader} />
                </td>
                <td className="px-4 py-3 align-middle">
                  <LeaderCell text={row.rushLeader} />
                </td>
                <td className="px-4 py-3 align-middle">
                  <LeaderCell text={row.recLeader} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Team schedule from API rows (single combined table).
 * @param {{ rows: Record<string, unknown>[], teamName: string }} props
 * @returns {JSX.Element}
 */
function TeamScheduleTable({ rows, teamName }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Full schedule · {teamName}</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
              <th className="px-3 py-2">Wk</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Opponent</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2">W-L</th>
              <th className="px-3 py-2">Hi pass</th>
              <th className="px-3 py-2">Hi rush</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r, idx) => {
              const oppAbbr = r.opponent_abbr ?? r.opponentAbbr;
              const isBye = String(r.result || "").toUpperCase() === "BYE" || !oppAbbr;
              const oppLogo = oppAbbr ? getTeamLogoUrl(oppAbbr) : null;
              const oppName = oppAbbr ? TEAM_NAMES[oppAbbr] ?? oppAbbr : "";
              const res = String(r.result || "");
              const win = res.startsWith("W");
              const loss = res.startsWith("L");
              const wl = r.wl_record ?? r.wl ?? "—";
              const hiPass = r.hi_pass ?? r.hiPass ?? "—";
              const hiRush = r.hi_rush ?? r.hiRush ?? "—";
              return (
                <tr key={`${r.week_label}-${idx}`} className="bg-white dark:bg-slate-950/40">
                  <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{r.week_label}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{r.date_label}</td>
                  <td className="px-3 py-2">
                    {isBye ? (
                      <span className="font-semibold text-slate-500 dark:text-slate-400">BYE WEEK</span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">{r.home ? "vs" : "@"}</span>
                        {oppLogo ? (
                          <img src={oppLogo} alt="" className="h-6 w-6 object-contain" loading="lazy" onError={hideBrokenImage} />
                        ) : null}
                        <span className="text-blue-600 dark:text-blue-400">{oppName}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isBye ? (
                      "—"
                    ) : (
                      <span
                        className={`font-semibold ${
                          win ? "text-emerald-600 dark:text-emerald-400" : loss ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {res}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{wl}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{hiPass}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{hiRush}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * NFL schedule tab: live league week (scoreboard) or team schedule (ESPN).
 * @returns {JSX.Element}
 */
export default function ScheduleTab() {
  const [season, setSeason] = useState(DEFAULT_SEASON);
  const [week, setWeek] = useState(1);
  const [teamScope, setTeamScope] = useState(/** @type {"league" | string} */ ("league"));
  const [teamPick, setTeamPick] = useState("BUF");

  const leagueQuery = useQuery({
    queryKey: ["nfl-scoreboard", season, week, 2],
    queryFn: async () => {
      const res = await getNflScoreboard(season, week, 2);
      return res.data;
    },
    enabled: teamScope === "league",
    retry: 1,
  });

  const teamQuery = useQuery({
    queryKey: ["nfl-team-schedule", teamPick, season],
    queryFn: async () => {
      const res = await getNflTeamSchedule(teamPick, season);
      return res.data;
    },
    enabled: teamScope !== "league",
    retry: 1,
  });

  const weekStrip = leagueQuery.data?.week_strip ?? [];
  const stripIndex = useMemo(() => {
    const idx = weekStrip.findIndex((w) => w.week === week);
    return idx >= 0 ? idx : 0;
  }, [weekStrip, week]);

  useEffect(() => {
    if (!weekStrip.length) return;
    const nums = weekStrip.map((w) => w.week);
    if (!nums.includes(week)) setWeek(nums[Math.min(nums.length - 1, 17)] ?? nums[0]);
  }, [weekStrip, week]);

  /**
   * @param {number} delta
   * @returns {void}
   */
  const shiftWeek = (delta) => {
    if (!weekStrip.length) {
      setWeek((w) => Math.min(18, Math.max(1, w + delta)));
      return;
    }
    const next = Math.min(weekStrip.length - 1, Math.max(0, stripIndex + delta));
    setWeek(weekStrip[next].week);
  };

  const leagueDays = useMemo(() => scoreboardToLeagueDays(leagueQuery.data?.days ?? []), [leagueQuery.data]);
  const leagueBusy = leagueQuery.isPending || leagueQuery.isFetching;
  const teamBusy = teamQuery.isPending || teamQuery.isFetching;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {teamScope === "league" ? "NFL Schedule" : `${TEAM_NAMES[teamPick] ?? teamPick} Schedule`}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Live schedules from ESPN via LineupOS API ({SEASON_OPTIONS[SEASON_OPTIONS.length - 1]}–{SEASON_OPTIONS[0]}).</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {SEASON_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Team schedules</label>
          <select
            value={teamScope === "league" ? "league" : teamPick}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "league") setTeamScope("league");
              else {
                setTeamScope("team");
                setTeamPick(v);
              }
            }}
            className="min-w-[200px] rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="league">League — all teams</option>
            {ALL_TEAM_ABBRS.map((abbr) => (
              <option key={abbr} value={abbr}>
                {TEAM_NAMES[abbr] ?? abbr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {teamScope === "league" ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            disabled={leagueBusy || (weekStrip.length ? stripIndex <= 0 : week <= 1)}
            className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="Previous week"
          >
            <ChevronIcon direction="left" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto pb-1">
            {(weekStrip.length ? weekStrip : [{ week, label: `WEEK ${week}`, range: "" }]).map((w, idx) => {
              const isOn = w.week === week;
              const activeStrip = weekStrip.length > 0;
              return (
                <button
                  key={`${w.week}-${idx}`}
                  type="button"
                  onClick={() => activeStrip && setWeek(w.week)}
                  disabled={!activeStrip && idx !== 0}
                  className={`shrink-0 text-left ${isOn ? "text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                >
                  <span className="block text-xs font-bold uppercase tracking-wide">{w.label}</span>
                  {w.range ? <span className="block text-[11px] text-slate-500 dark:text-slate-400">{w.range}</span> : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            disabled={leagueBusy || (weekStrip.length ? stripIndex >= weekStrip.length - 1 : week >= 22)}
            className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="Next week"
          >
            <ChevronIcon direction="right" />
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="Calendar"
          >
            <CalendarIcon />
          </button>
        </div>
      ) : null}

      {teamScope === "league" ? (
        leagueQuery.isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {leagueQuery.error?.response?.data?.detail || leagueQuery.error?.message || "Could not load schedule."}
          </p>
        ) : leagueBusy ? (
          <LoadingPanel label="Loading schedule…" />
        ) : leagueDays.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">
            No games for season {season}, week {week}.
          </p>
        ) : (
          <div className="space-y-8">
            {leagueDays.map((d) => (
              <LeagueDayTable key={d.dateLabel} day={d} />
            ))}
          </div>
        )
      ) : teamQuery.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {teamQuery.error?.response?.data?.detail || teamQuery.error?.message || "Could not load team schedule."}
        </p>
      ) : teamBusy ? (
        <LoadingPanel label="Loading team schedule…" />
      ) : (
        <TeamScheduleTable rows={teamQuery.data?.rows ?? []} teamName={teamQuery.data?.team_name ?? teamPick} />
      )}
    </div>
  );
}
