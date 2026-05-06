import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNflGameDetail } from "../api/client.js";
import { TEAM_NAMES } from "../data/nflRankingsStatic.js";
import LoadingPanel from "./LoadingPanel.jsx";

/**
 * Full-screen overlay with tabbed box score and play-by-play for one game.
 * @param {{
 *   gameId: string | null,
 *   labelAway: string,
 *   labelHome: string,
 *   onClose: () => void,
 *   initialTab?: "box" | "pbp",
 * }} props
 * @returns {JSX.Element | null}
 */
export default function GameDetailModal({
  gameId,
  labelAway,
  labelHome,
  onClose,
  initialTab = "box",
}) {
  const [tab, setTab] = useState(/** @type {"box" | "pbp"} */ (initialTab));

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, gameId]);

  useEffect(() => {
    if (!gameId) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameId, onClose]);

  const detailQuery = useQuery({
    queryKey: ["nfl-game-detail", gameId],
    queryFn: async () => {
      const res = await getNflGameDetail(/** @type {string} */ (gameId));
      return res.data;
    },
    enabled: Boolean(gameId),
    retry: 1,
  });

  if (!gameId) return null;

  const busy = detailQuery.isPending || detailQuery.isFetching;
  const data = detailQuery.data;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92vh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:rounded-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="min-w-0">
            <h2 id="game-detail-title" className="truncate text-lg font-bold text-slate-900 dark:text-white">
              {labelAway} @ {labelHome}
            </h2>
            {data?.status ? (
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {data.status}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Close
          </button>
        </header>

        <div className="flex shrink-0 gap-1 border-b border-slate-200 px-3 pt-2 dark:border-slate-800 sm:px-4">
          {(
            [
              { id: /** @type {const} */ ("box"), label: "Box score" },
              { id: /** @type {const} */ ("pbp"), label: "Play-by-play" },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-2 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {t.label}
              {tab === t.id ? (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-red-600 dark:bg-red-500" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          {detailQuery.isError ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {detailQuery.error?.response?.data?.detail ||
                detailQuery.error?.message ||
                "Could not load game detail."}
            </div>
          ) : null}

          {busy ? <LoadingPanel label="Loading game detail…" /> : null}

          {!busy && !detailQuery.isError && data && tab === "box" ? (
            <div className="space-y-8">
              {(data.box_score ?? []).map((teamBlock) => (
                <section key={teamBlock.team_abbr}>
                  <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
                    {TEAM_NAMES[teamBlock.team_abbr] ?? teamBlock.team_abbr}
                  </h3>
                  <div className="space-y-6">
                    {(teamBlock.tables ?? []).map((tbl) => (
                      <div key={`${teamBlock.team_abbr}-${tbl.title}`} className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                        <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                          {tbl.title}
                        </p>
                        <table className="min-w-full text-left text-xs sm:text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/50">
                              <th className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">
                                Player
                              </th>
                              {(tbl.columns ?? []).map((col) => (
                                <th
                                  key={col}
                                  className="whitespace-nowrap px-2 py-2 text-center font-semibold text-slate-600 dark:text-slate-400"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(tbl.rows ?? []).map((row, ridx) => (
                              <tr key={`${tbl.title}-${row.player}-${ridx}`} className="bg-white dark:bg-slate-950/30">
                                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900 dark:text-white">
                                  {row.jersey ? `#${row.jersey} ` : ""}
                                  {row.player}
                                </td>
                                {(row.values ?? []).map((v, i) => (
                                  <td
                                    key={`${row.player}-${i}`}
                                    className="whitespace-nowrap px-2 py-2 text-center tabular-nums text-slate-700 dark:text-slate-300"
                                  >
                                    {v}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}

          {!busy && !detailQuery.isError && data && tab === "pbp" ? (
            <div className="space-y-0">
              {(data.play_by_play ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No play-by-play rows for this game.</p>
              ) : (
                <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(data.play_by_play ?? []).map((play, idx) => (
                    <li
                      key={`pbp-${idx}`}
                      className={`flex gap-3 py-2.5 sm:gap-4 ${
                        play.scoring_play ? "border-l-2 border-l-emerald-500 bg-emerald-50/50 pl-3 dark:bg-emerald-950/20" : ""
                      }`}
                    >
                      <div className="w-14 shrink-0 text-right text-[10px] font-semibold uppercase tabular-nums text-slate-500 dark:text-slate-400 sm:w-16">
                        {play.period != null ? `Q${play.period}` : "—"}
                        <span className="mt-0.5 block font-normal normal-case text-slate-400 dark:text-slate-500">
                          {play.clock || "—"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        {play.short_type ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            {play.short_type}
                          </span>
                        ) : null}
                        <p className="text-sm leading-snug text-slate-800 dark:text-slate-200">{play.description}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400">{data.away_abbr}</span>{" "}
                        {play.away_score ?? "—"}
                        <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-slate-500 dark:text-slate-400">{data.home_abbr}</span>{" "}
                        {play.home_score ?? "—"}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
