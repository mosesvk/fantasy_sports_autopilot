import { useQuery } from "@tanstack/react-query";
import { getPlayerStats } from "../api/client.js";

/**
 * Slide-out drawer showing a selected player's weekly stat history.
 * @param {{ playerId: number | null, onClose: () => void }} props Component props
 * @returns {JSX.Element}
 */
export default function StatsDrawer({ playerId, onClose }) {
  const statsQuery = useQuery({
    queryKey: ["player-stats", playerId],
    queryFn: async () => {
      const res = await getPlayerStats(playerId);
      return res.data;
    },
    enabled: playerId != null,
  });

  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-200 ${
        playerId != null ? "pointer-events-auto bg-black/50 opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
    >
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-xl border-l border-slate-800 bg-slate-950 shadow-2xl transition-transform duration-300 ${
          playerId != null ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Player stats</h3>
            {statsQuery.data?.player ? (
              <p className="text-sm text-slate-400">
                {statsQuery.data.player.name} · {statsQuery.data.player.position} ·{" "}
                {statsQuery.data.player.team ?? "FA"}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2 py-1 text-slate-300 hover:text-white"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {statsQuery.isLoading ? (
            <p className="text-slate-400">Loading player stats...</p>
          ) : statsQuery.isError ? (
            <p className="text-red-300">Failed to load player stats.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-4">Season</th>
                    <th className="py-2 pr-4">Week</th>
                    <th className="py-2 pr-4 text-right">Proj</th>
                    <th className="py-2 text-right">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {(statsQuery.data?.stats || []).map((row) => (
                    <tr key={`${row.season}-${row.week}`} className="border-b border-slate-900">
                      <td className="py-2 pr-4 text-slate-300">{row.season}</td>
                      <td className="py-2 pr-4 text-slate-300">{row.week}</td>
                      <td className="py-2 pr-4 text-right text-blue-400">
                        {row.projected_points != null ? row.projected_points.toFixed(1) : "—"}
                      </td>
                      <td className="py-2 text-right text-slate-300">
                        {row.points != null ? row.points.toFixed(1) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
