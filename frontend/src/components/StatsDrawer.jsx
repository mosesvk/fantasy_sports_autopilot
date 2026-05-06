import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { getPlayerStats, getPlayerStatsBySleeper } from "../api/client.js";
import { getPlayerHeadshotUrl, getTeamLogoUrl } from "../utils/media.js";
import LoadingPanel from "./LoadingPanel.jsx";

/** @typedef {{ key: string, label: string }} StatColumnDef */

const IDP_POSITIONS = new Set([
  "LB",
  "DL",
  "DB",
  "DE",
  "DT",
  "CB",
  "SS",
  "FS",
  "S",
  "SAF",
  "OLB",
  "ILB",
  "MLB",
  "NT",
  "EDGE",
]);

/**
 * Map player position to Sleeper stat keys shown in history tables.
 * @param {string | undefined} position NFL position code.
 * @returns {StatColumnDef[]}
 */
const getPositionStatColumns = (position) => {
  const pos = String(position || "").toUpperCase();
  if (pos === "QB") {
    return [
      { key: "pass_cmp", label: "CMP" },
      { key: "pass_att", label: "ATT" },
      { key: "pass_yd", label: "PASS YD" },
      { key: "pass_td", label: "PASS TD" },
      { key: "pass_int", label: "INT" },
      { key: "pass_sack", label: "SACK" },
      { key: "rush_att", label: "RUSH" },
      { key: "rush_yd", label: "RUSH YD" },
    ];
  }
  if (pos === "RB") {
    return [
      { key: "rush_att", label: "RUSH ATT" },
      { key: "rush_yd", label: "RUSH YD" },
      { key: "rush_td", label: "RUSH TD" },
      { key: "rec", label: "REC" },
      { key: "rec_tgt", label: "TGTS" },
      { key: "rec_yd", label: "REC YD" },
      { key: "rec_td", label: "REC TD" },
    ];
  }
  if (pos === "WR" || pos === "TE") {
    return [
      { key: "rec", label: "REC" },
      { key: "rec_tgt", label: "TGTS" },
      { key: "rec_yd", label: "REC YD" },
      { key: "rec_td", label: "REC TD" },
      { key: "rush_att", label: "RUSH" },
      { key: "rush_yd", label: "RUSH YD" },
    ];
  }
  if (IDP_POSITIONS.has(pos)) {
    return [
      { key: "idp_tkl", label: "TOT" },
      { key: "idp_tkl_solo", label: "SOLO" },
      { key: "idp_tkl_ast", label: "AST" },
      { key: "idp_sack", label: "SACK" },
      { key: "idp_qb_hit", label: "QBH" },
      { key: "idp_tkl_loss", label: "TFL" },
      { key: "idp_ff", label: "FF" },
      { key: "idp_int", label: "INT" },
      { key: "idp_pass_def", label: "PD" },
    ];
  }
  if (pos === "K") {
    return [
      { key: "fgm", label: "FGM" },
      { key: "fga", label: "FGA" },
      { key: "xpm", label: "XPM" },
    ];
  }
  return [
    { key: "idp_tkl", label: "TOT" },
    { key: "idp_sack", label: "SACK" },
    { key: "rec_yd", label: "REC YD" },
    { key: "rush_yd", label: "RUSH YD" },
  ];
};

/**
 * Format a numeric Sleeper stat for table cells.
 * @param {unknown} value Raw stat value.
 * @returns {string}
 */
const formatStatCell = (value) => {
  if (value == null || value === "") return "—";
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1);
  }
  return String(value);
};

/**
 * IDP / team defense: show season rollups only (no weekly fantasy view).
 * @param {string | undefined} position NFL position code.
 * @returns {boolean}
 */
const isDefenseHistoryPosition = (position) => {
  const pos = String(position || "").toUpperCase();
  return IDP_POSITIONS.has(pos) || pos === "DEF";
};

/**
 * Slide-out drawer showing a selected player's weekly stat history.
 * @param {{
 *   playerId?: number | null,
 *   sleeperId?: string | null,
 *   onClose: () => void
 * }} props Component props
 * @returns {JSX.Element}
 */
export default function StatsDrawer({ playerId = null, sleeperId = null, onClose }) {
  const [activeHistoryTab, setActiveHistoryTab] = useState("weekly");
  const isOpen = playerId != null || (sleeperId != null && sleeperId !== "");

  const statsQuery = useQuery({
    queryKey: ["player-stats", playerId, sleeperId],
    queryFn: async () => {
      if (playerId != null) {
        const res = await getPlayerStats(playerId);
        return res.data;
      }
      const res = await getPlayerStatsBySleeper(sleeperId);
      return res.data;
    },
    enabled: isOpen,
    staleTime: 30 * 60 * 1000,
  });

  /**
   * Hide broken remote images so fallback text remains visible.
   * @param {React.SyntheticEvent<HTMLImageElement>} event Image error event.
   * @returns {void}
   */
  const hideBrokenImage = (event) => {
    event.currentTarget.style.display = "none";
  };

  const profile = statsQuery.data?.player;
  const weeklyRows = statsQuery.data?.stats || [];
  /**
   * Most recent season in weekly history; weekly tab only lists projections for this year.
   * @type {number | null}
   */
  const latestWeeklySeason = useMemo(() => {
    if (!weeklyRows.length) return null;
    return Math.max(...weeklyRows.map((r) => Number(r.season)));
  }, [weeklyRows]);
  /**
   * Weekly rows for latest season only, sorted by week ascending.
   */
  const latestSeasonProjectedRows = useMemo(() => {
    if (latestWeeklySeason == null) return [];
    return weeklyRows
      .filter((r) => Number(r.season) === latestWeeklySeason)
      .slice()
      .sort((a, b) => Number(a.week) - Number(b.week));
  }, [weeklyRows, latestWeeklySeason]);
  const statColumns = useMemo(() => getPositionStatColumns(profile?.position), [profile?.position]);
  const defenseOnlyHistory = useMemo(
    () => isDefenseHistoryPosition(profile?.position),
    [profile?.position],
  );
  const rosterLabel = profile?.is_retired
    ? "Retired"
    : profile?.team
      ? profile.team
      : "Free agent";

  /**
   * Build full season rows from weekly fantasy stat history.
   * @type {Array<{season:number, team:string, games:number, projected_total:number, actual_total:number, avg_points:number}>}
   */
  const fullSeasonRows = useMemo(() => {
    const seasonMap = new Map();
    weeklyRows.forEach((row) => {
      const season = Number(row.season);
      if (!seasonMap.has(season)) {
        seasonMap.set(season, {
          season,
          games: 0,
          projected_total: 0,
          actual_total: 0,
          sums: {},
        });
      }
      const target = seasonMap.get(season);
      target.games += 1;
      target.projected_total += row.projected_points ?? 0;
      target.actual_total += row.points ?? 0;
      const st = row.actual_stats || {};
      statColumns.forEach(({ key }) => {
        const v = st[key];
        if (typeof v === "number" && Number.isFinite(v)) {
          target.sums[key] = (target.sums[key] || 0) + v;
        }
      });
    });
    return [...seasonMap.values()]
      .map((row) => ({
        ...row,
        avg_points: row.games > 0 ? row.actual_total / row.games : 0,
      }))
      .sort((a, b) => b.season - a.season);
  }, [weeklyRows, statColumns]);

  useEffect(() => {
    if (defenseOnlyHistory) {
      setActiveHistoryTab("full");
    }
  }, [defenseOnlyHistory, profile?.sleeper_id]);

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] transition-opacity duration-200 ${
        isOpen ? "pointer-events-auto bg-black/50 opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
      aria-hidden={!isOpen}
    >
      <section
        className={`absolute left-1/2 top-1/2 h-[86vh] w-[95vw] max-w-3xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-950 ${
          isOpen
            ? "-translate-y-1/2 opacity-100"
            : "pointer-events-none -translate-y-[45%] opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Player profile"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Player profile</h3>
            {profile ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {profile.name} · {profile.position} · {rosterLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="h-[calc(86vh-74px)] overflow-y-auto p-5">
          {statsQuery.isLoading ? (
            <LoadingPanel label="Loading data..." />
          ) : statsQuery.isError ? (
            <p className="text-red-600 dark:text-red-300">Failed to load player stats.</p>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                    <img
                      src={getPlayerHeadshotUrl(profile?.sleeper_id) ?? undefined}
                      alt={profile ? `${profile.name} headshot` : "Player headshot"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={hideBrokenImage}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {profile?.name ?? "Unknown player"}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="rounded-md border border-slate-300 px-2 py-0.5 dark:border-slate-700">
                        {profile?.position ?? "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        {!profile?.is_retired ? (
                          <img
                            src={getTeamLogoUrl(profile?.team) ?? undefined}
                            alt={profile?.team ? `${profile.team} logo` : "No team"}
                            className="h-4 w-4 object-contain"
                            loading="lazy"
                            onError={hideBrokenImage}
                          />
                        ) : null}
                        {rosterLabel}
                      </span>
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        Proj: {profile?.projected_points != null ? profile.projected_points.toFixed(1) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-xs uppercase tracking-wide text-slate-500">College</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {profile?.college || "Not available"}
                  </p>
                </article>
                <article className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Experience</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {profile?.years_exp != null ? `${profile.years_exp} years` : "Not available"}
                  </p>
                </article>
                <article className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Age</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {profile?.age ?? "Not available"}
                  </p>
                </article>
                <article className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Injury status</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {profile?.injury_status || "Healthy / not listed"}
                  </p>
                </article>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-base font-semibold text-slate-900 dark:text-white">Stats history</h5>
                    {defenseOnlyHistory ? (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Season totals (2020–present) — defensive players
                      </p>
                    ) : null}
                  </div>
                  {!defenseOnlyHistory ? (
                    <div className="inline-flex shrink-0 rounded-full border border-slate-200 p-1 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setActiveHistoryTab("weekly")}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          activeHistoryTab === "weekly"
                            ? "bg-blue-600 text-white"
                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        Weekly (fantasy)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveHistoryTab("full")}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          activeHistoryTab === "full"
                            ? "bg-blue-600 text-white"
                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        Full stats history
                      </button>
                    </div>
                  ) : null}
                </div>
                {!defenseOnlyHistory && activeHistoryTab === "weekly" ? (
                  <div className="overflow-x-auto">
                    {latestWeeklySeason == null ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No weekly game stats found.</p>
                    ) : (
                      <>
                        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                          Fantasy projections · season {latestWeeklySeason}
                        </p>
                        {latestSeasonProjectedRows.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No projected points for season {latestWeeklySeason}.
                          </p>
                        ) : (
                          <table className="min-w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                <th className="py-2 pr-4">Week</th>
                                <th className="py-2 text-right">Projected</th>
                              </tr>
                            </thead>
                            <tbody>
                              {latestSeasonProjectedRows.map((row) => (
                                <tr
                                  key={`${row.season}-${row.week}`}
                                  className="border-b border-slate-100 dark:border-slate-900"
                                >
                                  <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{row.week}</td>
                                  <td className="py-2 text-right text-blue-600 dark:text-blue-400">
                                    {row.projected_points != null ? row.projected_points.toFixed(1) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {fullSeasonRows.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No season rollups yet.</p>
                    ) : (
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            <th className="py-2 pr-4">Season</th>
                            <th className="py-2 pr-4 text-right">GP</th>
                            {statColumns.map((col) => (
                              <th key={col.key} className="py-2 pr-2 text-right">
                                {col.label}
                              </th>
                            ))}
                            <th className="py-2 pr-4 text-right">Proj Σ</th>
                            <th className="py-2 pr-4 text-right">FP Σ</th>
                            <th className="py-2 text-right">FP/G</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fullSeasonRows.map((row) => (
                            <tr key={`full-${row.season}`} className="border-b border-slate-100 dark:border-slate-900">
                              <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{row.season}</td>
                              <td className="py-2 pr-4 text-right text-slate-700 dark:text-slate-300">
                                {row.games}
                              </td>
                              {statColumns.map((col) => (
                                <td key={col.key} className="py-2 pr-2 text-right text-slate-700 dark:text-slate-300">
                                  {formatStatCell(row.sums[col.key])}
                                </td>
                              ))}
                              <td className="py-2 pr-4 text-right text-blue-600 dark:text-blue-400">
                                {row.projected_total.toFixed(1)}
                              </td>
                              <td className="py-2 pr-4 text-right text-slate-700 dark:text-slate-300">
                                {row.actual_total.toFixed(1)}
                              </td>
                              <td className="py-2 text-right text-slate-700 dark:text-slate-300">
                                {row.avg_points.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
