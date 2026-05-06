import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNflScoreboard } from "../api/client.js";
import { TEAM_NAMES } from "../data/nflRankingsStatic.js";
import { getEspnNflHeadshotUrl, getTeamLogoUrl } from "../utils/media.js";
import { getDefaultNflSeasonYear } from "../utils/nflSeasons.js";
import LoadingPanel from "./LoadingPanel.jsx";
import GameDetailModal from "./GameDetailModal.jsx";

const DEFAULT_SEASON = getDefaultNflSeasonYear();
const DEFAULT_WEEK = 12;
/** Earliest season offered in the scoreboard season dropdown. */
const MIN_SCOREBOARD_SEASON = 2020;

/**
 * NFL regular-season kickoff is modeled as the first Thursday in September for year `year`.
 * A season year becomes selectable only on/after that date (so e.g. 2026 is not listed until then).
 * @param {number} year Calendar year (e.g. 2026 for the 2026 NFL season).
 * @returns {Date}
 */
const nflSeasonKickoffThursday = (year) => {
  const sep1 = new Date(year, 8, 1);
  const dow = sep1.getDay();
  const daysToThursday = (4 - dow + 7) % 7;
  return new Date(year, 8, 1 + daysToThursday);
};

/**
 * Latest NFL season year the user may pick: the newest season whose opening Thursday has passed.
 * @param {Date} [d]
 * @returns {number}
 */
const maxSelectableNflSeason = (d = new Date()) => {
  let max = d.getFullYear() + 1;
  while (max > MIN_SCOREBOARD_SEASON && d < nflSeasonKickoffThursday(max)) {
    max -= 1;
  }
  return Math.max(MIN_SCOREBOARD_SEASON, max);
};

/**
 * Descending list of seasons available in the UI (newest first).
 * @param {number} maxSeason
 * @returns {number[]}
 */
const seasonOptionsDescending = (maxSeason) => {
  const out = [];
  for (let y = maxSeason; y >= MIN_SCOREBOARD_SEASON; y -= 1) {
    out.push(y);
  }
  return out;
};

/**
 * Hide broken logo images.
 * @param {React.SyntheticEvent<HTMLImageElement>} event
 * @returns {void}
 */
const hideBrokenImage = (event) => {
  event.currentTarget.style.display = "none";
};

/**
 * Chevron icon for week navigation.
 * @param {{ direction: "left" | "right" }} props
 * @returns {JSX.Element}
 */
function ChevronIcon({ direction }) {
  const rotate = direction === "left" ? "" : "rotate-180";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-4 w-4 ${rotate}`}
      aria-hidden="true"
    >
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
 * Calendar grid icon for date picker affordance.
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
 * Renders one team's linescore row (numeric cells only; header row is separate).
 * @param {{
 *   label: string,
 *   abbr: string,
 *   record: string,
 *   split: string,
 *   line: { q: number[], total: number },
 *   won: boolean,
 * }} props
 * @returns {JSX.Element}
 */
function TeamLinescoreRow({ label, abbr, record, split, line, won }) {
  const logo = getTeamLogoUrl(abbr);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-2">
        {logo ? (
          <img src={logo} alt="" className="h-8 w-8 shrink-0 object-contain" loading="lazy" onError={hideBrokenImage} />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {record}
            {split ? `, ${split}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1">
        {line.q.map((pts, idx) => (
          <div
            key={`${abbr}-q-${idx}`}
            className="flex w-7 items-center justify-center sm:w-8"
          >
            <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{pts}</span>
          </div>
        ))}
        <div className="relative flex w-9 items-center justify-center border-l border-slate-200 pl-1 dark:border-slate-700 sm:w-10">
          {won ? (
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 text-slate-900 dark:text-white" aria-hidden="true">
              ◀
            </span>
          ) : null}
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{line.total}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Column labels for a linescore that may include overtime.
 * @param {number[]} quarters
 * @returns {string[]}
 */
const periodLabelsFor = (quarters) => quarters.map((_, i) => (i < 4 ? String(i + 1) : "OT"));

/**
 * One PASS / RUSH / REC row with optional ESPN headshot (ESPN-style scoreboard strip).
 * @param {{ label: string, line?: { detail?: string, espn_athlete_id?: string | null } }} props
 * @returns {JSX.Element}
 */
function ScoreboardPerformerRow({ label, line }) {
  const headshot = getEspnNflHeadshotUrl(line?.espn_athlete_id);
  return (
    <div className="flex gap-2.5">
      <div className="shrink-0">
        {headshot ? (
          <img
            src={headshot}
            alt=""
            className="h-10 w-10 rounded-full border border-slate-200 object-cover dark:border-slate-600"
            loading="lazy"
            onError={hideBrokenImage}
          />
        ) : (
          <div
            className="h-10 w-10 rounded-full border border-dashed border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-700 dark:text-slate-300">{line?.detail ?? "—"}</p>
      </div>
    </div>
  );
}

/**
 * Full scoreboard card for one game (API shape).
 * @param {{
 *   game: Record<string, unknown>,
 *   onOpenDetail: (gameId: string, tab: "box" | "pbp", awayAbbr: string, homeAbbr: string) => void,
 * }} props
 * @returns {JSX.Element}
 */
function ScoreboardGameCard({ game, onOpenDetail }) {
  const away = game.away;
  const home = game.home;
  const awayName = TEAM_NAMES[away.abbr] ?? away.abbr;
  const homeName = TEAM_NAMES[home.abbr] ?? home.abbr;
  const awayWon = away.score.total > home.score.total;
  const homeWon = home.score.total > away.score.total;
  const periodLabels = periodLabelsFor(away.score.q);
  const performers = game.performers ?? {};
  const gameId = typeof game.game_id === "string" ? game.game_id : "";
  const venue = typeof game.venue === "string" ? game.venue : "";
  const eventName = typeof game.event_name === "string" ? game.event_name : "";
  const gamecastUrl = gameId ? `https://www.espn.com/nfl/game/_/gameId/${gameId}` : "";
  const btnClass =
    "inline-flex justify-center rounded-full border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/40";

  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,240px)_auto] lg:items-start">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{game.status}</p>
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 pt-2 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">&nbsp;</span>
              <div className="flex items-center gap-0.5 sm:gap-1">
                {periodLabels.map((lab, idx) => (
                  <div
                    key={`hdr-${lab}-${idx}`}
                    className="flex w-7 items-center justify-center text-[10px] font-bold text-slate-400 sm:w-8"
                  >
                    {lab}
                  </div>
                ))}
                <div className="flex w-9 items-center justify-center border-l border-slate-200 pl-1 text-[10px] font-bold text-slate-400 dark:border-slate-700 sm:w-10">
                  T
                </div>
              </div>
            </div>
            <TeamLinescoreRow
              label={awayName}
              abbr={away.abbr}
              record={away.record}
              split={away.split}
              line={away.score}
              won={awayWon}
            />
            <TeamLinescoreRow
              label={homeName}
              abbr={home.abbr}
              record={home.record}
              split={home.split}
              line={home.score}
              won={homeWon}
            />
          </div>
          {venue ? (
            <p className="mt-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400">{venue}</p>
          ) : null}
          {eventName ? (
            <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              {eventName}
            </p>
          ) : null}
        </div>
        <div className="min-w-0 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0 dark:border-slate-800">
          <h3 className="text-base font-bold leading-snug text-slate-900 dark:text-white">{game.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{game.summary}</p>
        </div>
        <div className="border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0 dark:border-slate-800">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Top performers</p>
          <ul className="space-y-3">
            <li>
              <ScoreboardPerformerRow label="Pass" line={performers.passing} />
            </li>
            <li>
              <ScoreboardPerformerRow label="Rush" line={performers.rushing} />
            </li>
            <li>
              <ScoreboardPerformerRow label="Rec" line={performers.receiving} />
            </li>
          </ul>
        </div>
        <div className="flex flex-row gap-2 border-t border-slate-100 pt-4 lg:flex-col lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0 dark:border-slate-800">
          {gamecastUrl ? (
            <a
              href={gamecastUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnClass} no-underline`}
            >
              Gamecast
            </a>
          ) : (
            <span className={`${btnClass} pointer-events-none opacity-40`} aria-disabled>
              Gamecast
            </span>
          )}
          <button
            type="button"
            className={btnClass}
            disabled={!gameId}
            onClick={() => gameId && onOpenDetail(gameId, "box", away.abbr, home.abbr)}
          >
            Box score
          </button>
          <button
            type="button"
            className={btnClass}
            disabled={!gameId}
            onClick={() => gameId && onOpenDetail(gameId, "pbp", away.abbr, home.abbr)}
          >
            Play-by-play
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * Modal week list with year steppers (calendar affordance).
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   season: number,
 *   seasonChoices: number[],
 *   onSeasonChange: (y: number) => void,
 *   week: number,
 *   onWeekChange: (w: number) => void,
 *   weekStrip: Array<{ week: number, label: string, range: string }>,
 * }} props
 * @returns {JSX.Element | null}
 */
function ScoreboardWeekPickerModal({
  open,
  onClose,
  season,
  seasonChoices,
  onSeasonChange,
  week,
  onWeekChange,
  weekStrip,
}) {
  if (!open) return null;

  const sIdx = seasonChoices.indexOf(season);
  const canOlder = sIdx >= 0 && sIdx < seasonChoices.length - 1;
  const canNewer = sIdx > 0;
  const goOlder = () => {
    if (canOlder) onSeasonChange(seasonChoices[sIdx + 1]);
  };
  const goNewer = () => {
    if (canNewer) onSeasonChange(seasonChoices[sIdx - 1]);
  };

  const rows =
    weekStrip.length > 0
      ? weekStrip
      : Array.from({ length: 22 }, (_, i) => ({
          week: i + 1,
          label: `WEEK ${i + 1}`,
          range: "",
        }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoreboard-week-picker-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close week picker"
        onClick={onClose}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl dark:rounded-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700 sm:max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <button
            type="button"
            onClick={goOlder}
            disabled={!canOlder}
            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-30 dark:text-blue-400 dark:hover:bg-slate-800"
            aria-label="Previous season"
          >
            <span className="text-lg font-bold" aria-hidden>
              «
            </span>
          </button>
          <h2 id="scoreboard-week-picker-title" className="text-lg font-bold text-slate-900 dark:text-white">
            {season}
          </h2>
          <button
            type="button"
            onClick={goNewer}
            disabled={!canNewer}
            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-30 dark:text-blue-400 dark:hover:bg-slate-800"
            aria-label="Next season"
          >
            <span className="text-lg font-bold" aria-hidden>
              »
            </span>
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {rows.map((w) => {
            const on = w.week === week;
            return (
              <li key={w.week}>
                <button
                  type="button"
                  onClick={() => {
                    onWeekChange(w.week);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    on
                      ? "bg-blue-50 font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
                      : "text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <span>{w.label}</span>
                  {w.range ? (
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{w.range}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-slate-200 p-3 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg py-2.5 text-sm font-bold uppercase tracking-wide text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * NFL scoreboard tab: live data via LineupOS API (ESPN-backed).
 * @returns {JSX.Element}
 */
export default function ScoresTab() {
  const maxSeason = maxSelectableNflSeason(new Date());
  const [season, setSeason] = useState(() => Math.min(DEFAULT_SEASON, maxSeason));
  const [week, setWeek] = useState(DEFAULT_WEEK);
  const [detailModal, setDetailModal] = useState(
    /** @type {{ gameId: string, tab: "box" | "pbp", awayAbbr: string, homeAbbr: string } | null} */ (null),
  );
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);

  const seasonChoices = useMemo(() => seasonOptionsDescending(maxSeason), [maxSeason]);

  const scoreboardQuery = useQuery({
    queryKey: ["nfl-scoreboard", season, week],
    queryFn: async () => {
      const res = await getNflScoreboard(season, week, 2);
      return res.data;
    },
    retry: 1,
  });

  const weekStrip = scoreboardQuery.data?.week_strip ?? [];
  const days = scoreboardQuery.data?.days ?? [];

  /**
   * Keep season within allowed years (e.g. cannot stay on 2026 before that season kicks off).
   * @returns {void}
   */
  useEffect(() => {
    if (season > maxSeason) {
      setSeason(maxSeason);
    }
  }, [season, maxSeason]);

  /**
   * When the calendar strip loads, clamp an out-of-range week to a valid value.
   * @returns {void}
   */
  useEffect(() => {
    if (!weekStrip.length) return;
    const nums = weekStrip.map((w) => w.week);
    if (!nums.includes(week)) {
      const fallback = nums.includes(DEFAULT_WEEK) ? DEFAULT_WEEK : nums[0];
      setWeek(fallback);
    }
  }, [weekStrip, week]);

  const stripIndex = useMemo(() => {
    const idx = weekStrip.findIndex((w) => w.week === week);
    return idx >= 0 ? idx : 0;
  }, [weekStrip, week]);

  const weekSelectOptions = useMemo(() => {
    if (weekStrip.length) {
      const mapped = weekStrip.map((w) => ({
        value: w.week,
        label: w.range ? `${w.label} · ${w.range}` : w.label,
      }));
      if (!mapped.some((o) => o.value === week)) {
        mapped.push({ value: week, label: `Week ${week}` });
        mapped.sort((a, b) => a.value - b.value);
      }
      return mapped;
    }
    return Array.from({ length: 22 }, (_, i) => {
      const n = i + 1;
      return { value: n, label: `Week ${n}` };
    });
  }, [weekStrip, week]);

  /**
   * @param {number} delta
   * @returns {void}
   */
  const shiftWeek = (delta) => {
    if (!weekStrip.length) {
      setWeek((w) => Math.min(22, Math.max(1, w + delta)));
      return;
    }
    const next = Math.min(weekStrip.length - 1, Math.max(0, stripIndex + delta));
    setWeek(weekStrip[next].week);
  };

  const busy = scoreboardQuery.isPending || scoreboardQuery.isFetching;

  /**
   * @param {string} gameId
   * @param {"box" | "pbp"} tab
   * @param {string} awayAbbr
   * @param {string} homeAbbr
   * @returns {void}
   */
  const openGameDetail = (gameId, tab, awayAbbr, homeAbbr) => {
    setDetailModal({ gameId, tab, awayAbbr, homeAbbr });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">NFL Scoreboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live scores via LineupOS API (ESPN). Season and week update the feed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Season</span>
            <select
              value={season}
              onChange={(e) => setSeason(Number(e.target.value))}
              className="min-w-[5.5rem] rounded-md border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              {seasonChoices.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Week</span>
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="min-w-[12rem] rounded-md border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              {weekSelectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b-2 border-slate-200 pb-0 dark:border-slate-800 sm:gap-2">
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          disabled={busy || (weekStrip.length ? stripIndex <= 0 : week <= 1)}
          className="shrink-0 rounded-full border border-blue-600 bg-white p-2 text-blue-600 shadow-sm hover:bg-blue-50 disabled:opacity-40 dark:border-blue-500 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-slate-800"
          aria-label="Previous week"
        >
          <ChevronIcon direction="left" />
        </button>
        <div className="flex min-w-0 flex-1 items-end gap-4 overflow-x-auto px-1 pb-1 sm:gap-5">
          {(weekStrip.length ? weekStrip : [{ week, label: `WEEK ${week}`, range: "" }]).map((w, idx) => {
            const isOn = w.week === week;
            const activeStrip = weekStrip.length > 0;
            return (
              <button
                key={`${w.week}-${idx}`}
                type="button"
                onClick={() => activeStrip && setWeek(w.week)}
                disabled={!activeStrip && idx !== 0}
                className={`shrink-0 border-b-2 pb-2 text-left transition-colors ${
                  isOn
                    ? "border-slate-900 font-bold text-slate-900 dark:border-white dark:text-white"
                    : "border-transparent font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
                }`}
              >
                <span className="block text-[11px] font-bold uppercase tracking-wide">{w.label}</span>
                {w.range ? (
                  <span className="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-400">{w.range}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          disabled={busy || (weekStrip.length ? stripIndex >= weekStrip.length - 1 : week >= 22)}
          className="shrink-0 rounded-full border border-blue-600 bg-white p-2 text-blue-600 shadow-sm hover:bg-blue-50 disabled:opacity-40 dark:border-blue-500 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-slate-800"
          aria-label="Next week"
        >
          <ChevronIcon direction="right" />
        </button>
        <button
          type="button"
          onClick={() => setWeekPickerOpen(true)}
          className="shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Open week list"
        >
          <CalendarIcon />
        </button>
      </div>

      {scoreboardQuery.isError ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <p className="font-semibold">Could not load the scoreboard.</p>
          <p className="mt-1 text-red-700 dark:text-red-300">
            {scoreboardQuery.error?.response?.data?.detail ||
              scoreboardQuery.error?.message ||
              "Check that the API is running (VITE_API_URL) and try again."}
          </p>
        </div>
      ) : null}

      {busy ? (
        <LoadingPanel label="Loading scores…" />
      ) : !scoreboardQuery.isError && days.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">
          No games in this response for season {season}, week {week}. Try another week or season type on the API.
        </p>
      ) : !scoreboardQuery.isError ? (
        <div className="space-y-8">
          {days.map((day) => (
            <section key={day.date_label} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{day.date_label}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Odds by{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">DraftKings</span>
                </p>
              </div>
              <div className="space-y-4">
                {day.games.map((g) => (
                  <ScoreboardGameCard
                    key={`${day.date_label}-${g.away.abbr}-${g.home.abbr}`}
                    game={g}
                    onOpenDetail={openGameDetail}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <ScoreboardWeekPickerModal
        open={weekPickerOpen}
        onClose={() => setWeekPickerOpen(false)}
        season={season}
        seasonChoices={seasonChoices}
        onSeasonChange={setSeason}
        week={week}
        onWeekChange={setWeek}
        weekStrip={weekStrip}
      />

      {detailModal ? (
        <GameDetailModal
          gameId={detailModal.gameId}
          labelAway={TEAM_NAMES[detailModal.awayAbbr] ?? detailModal.awayAbbr}
          labelHome={TEAM_NAMES[detailModal.homeAbbr] ?? detailModal.homeAbbr}
          initialTab={detailModal.tab}
          onClose={() => setDetailModal(null)}
        />
      ) : null}
    </div>
  );
}
