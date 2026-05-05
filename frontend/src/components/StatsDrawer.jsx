import { useQuery } from "@tanstack/react-query";
import { getPlayerStats } from "../api/client.js";
import { getPlayerHeadshotUrl, getTeamLogoUrl } from "../utils/media.js";

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

  /**
   * Hide broken remote images so fallback text remains visible.
   * @param {React.SyntheticEvent<HTMLImageElement>} event Image error event.
   * @returns {void}
   */
  const hideBrokenImage = (event) => {
    event.currentTarget.style.display = "none";
  };

  const profile = statsQuery.data?.player;

  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-200 ${
        playerId != null ? "pointer-events-auto bg-black/50 opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
    >
      <section
        className={`absolute left-1/2 top-1/2 h-[86vh] w-[95vw] max-w-3xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-950 ${
          playerId != null
            ? "-translate-y-1/2 opacity-100"
            : "pointer-events-none -translate-y-[45%] opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Player profile</h3>
            {profile ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {profile.name} · {profile.position} · {profile.team ?? "FA"}
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
            <p className="text-slate-600 dark:text-slate-400">Loading player stats...</p>
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
                        <img
                          src={getTeamLogoUrl(profile?.team) ?? undefined}
                          alt={profile?.team ? `${profile.team} logo` : "No team"}
                          className="h-4 w-4 object-contain"
                          loading="lazy"
                          onError={hideBrokenImage}
                        />
                        {profile?.team ?? "Free agent"}
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
                <h5 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
                  Weekly stats history
                </h5>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <th className="py-2 pr-4">Season</th>
                        <th className="py-2 pr-4">Week</th>
                        <th className="py-2 pr-4 text-right">Proj</th>
                        <th className="py-2 text-right">Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(statsQuery.data?.stats || []).map((row) => (
                        <tr
                          key={`${row.season}-${row.week}`}
                          className="border-b border-slate-100 dark:border-slate-900"
                        >
                          <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{row.season}</td>
                          <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{row.week}</td>
                          <td className="py-2 pr-4 text-right text-blue-600 dark:text-blue-400">
                            {row.projected_points != null ? row.projected_points.toFixed(1) : "—"}
                          </td>
                          <td className="py-2 text-right text-slate-700 dark:text-slate-300">
                            {row.points != null ? row.points.toFixed(1) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
