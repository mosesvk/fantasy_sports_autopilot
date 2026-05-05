import { getPlayerHeadshotUrl, getTeamLogoUrl } from "../utils/media.js";

const SLOT_ORDER = [
  "QB",
  "RB1",
  "RB2",
  "WR1",
  "WR2",
  "TE",
  "FLEX",
  "K",
  "DEF",
];

const posColor = (pos) => {
  const map = {
    QB: "bg-sky-900/60 text-sky-200 border-sky-700",
    RB: "bg-emerald-900/60 text-emerald-200 border-emerald-700",
    WR: "bg-violet-900/60 text-violet-200 border-violet-700",
    TE: "bg-amber-900/60 text-amber-200 border-amber-700",
    K: "bg-rose-900/60 text-rose-200 border-rose-700",
    DEF: "bg-cyan-900/60 text-cyan-200 border-cyan-700",
  };
  return map[pos] || "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
};

/**
 * Displays optimized lineup slots with projected points.
 * @param {{ lineup: object | null, onPlayerClick?: (playerId: number) => void }} props Component props
 * @returns {JSX.Element}
 */
export default function LineupCard({ lineup, onPlayerClick }) {
  if (!lineup) return null;

  /**
   * Hide broken remote images so text fallback remains clean.
   * @param {React.SyntheticEvent<HTMLImageElement>} event Image error event.
   * @returns {void}
   */
  const hideBrokenImage = (event) => {
    event.currentTarget.style.display = "none";
  };

  const bySlot = Object.fromEntries(
    (lineup.starters || []).map((s) => [s.slot, s]),
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-lg dark:shadow-blue-950/40">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Optimized lineup</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Week {lineup.week} · Season {lineup.season}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {lineup.total_projected_points?.toFixed(1) ?? "—"}
          </div>
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            proj pts
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {SLOT_ORDER.map((slot) => {
          const row = bySlot[slot];
          return (
            <div
              key={slot}
              className={`flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60 ${
                row ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/80" : ""
              }`}
              onClick={() => {
                if (row?.player_id != null) {
                  onPlayerClick?.(row.player_id);
                }
              }}
            >
              <div className="flex items-center gap-3">
                <span className="w-14 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  {slot}
                </span>
                {row ? (
                  <span
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${posColor(row.position)}`}
                  >
                    {row.position}
                  </span>
                ) : null}
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 font-medium text-slate-900 dark:text-white">
                  {row ? (
                    <>
                      <img
                        src={getTeamLogoUrl(row.team) ?? undefined}
                        alt={row.team ? `${row.team} logo` : "No team"}
                        className="h-5 w-5 rounded-sm object-contain"
                        loading="lazy"
                        onError={hideBrokenImage}
                      />
                      <img
                        src={getPlayerHeadshotUrl(row.sleeper_id) ?? undefined}
                        alt={`${row.name} headshot`}
                        className="h-7 w-7 rounded-full border border-slate-300 object-cover dark:border-slate-700"
                        loading="lazy"
                        onError={hideBrokenImage}
                      />
                    </>
                  ) : null}
                  <span>{row?.name ?? "—"}</span>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {row?.projected_points != null
                    ? `${row.projected_points.toFixed(1)} pts`
                    : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
