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
  return map[pos] || "bg-slate-800 text-slate-200 border-slate-600";
};

/**
 * Displays optimized lineup slots with projected points.
 * @param {{ lineup: object | null }} props Component props
 * @returns {JSX.Element}
 */
export default function LineupCard({ lineup }) {
  if (!lineup) return null;

  const bySlot = Object.fromEntries(
    (lineup.starters || []).map((s) => [s.slot, s]),
  );

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-blue-950/40">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Optimized lineup</h2>
          <p className="text-sm text-slate-400">
            Week {lineup.week} · Season {lineup.season}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {SLOT_ORDER.map((slot) => {
          const row = bySlot[slot];
          return (
            <div
              key={slot}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-14 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                <div className="font-medium text-white">
                  {row?.name ?? "—"}
                </div>
                <div className="text-sm text-slate-400">
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
