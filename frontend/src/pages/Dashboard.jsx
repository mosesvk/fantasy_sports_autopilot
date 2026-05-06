import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllPlayers, getCurrentLineup, getLineupByWeek } from "../api/client.js";
import LineupCard from "../components/LineupCard.jsx";
import LoadingPanel from "../components/LoadingPanel.jsx";
import PlayerTable from "../components/PlayerTable.jsx";
import StatsDrawer from "../components/StatsDrawer.jsx";
import WeekSelector from "../components/WeekSelector.jsx";
import { getDefaultNflSeasonYear } from "../utils/nflSeasons.js";

/**
 * Main dashboard: current or historical lineup plus player table.
 * @returns {JSX.Element}
 */
export default function Dashboard() {
  const [weekMode, setWeekMode] = useState("current");
  const [season, setSeason] = useState(() => getDefaultNflSeasonYear());
  const [week, setWeek] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  /**
   * True while we should show a loading shell instead of content or empty states.
   * Uses `isSuccess` so we still show a spinner in brief React Query windows where
   * `isPending` and `isFetching` are both false but the query has not succeeded yet.
   * When a query has already succeeded, `isFetching` alone drives loading (e.g. refetch, new key).
   * @param {{ isError: boolean, isSuccess: boolean, isFetching: boolean }} query React Query result
   * @returns {boolean}
   */
  const isQueryBusy = (query) =>
    !query.isError && (!query.isSuccess || query.isFetching);

  const lineupQuery = useQuery({
    queryKey:
      weekMode === "current"
        ? ["lineup", "current"]
        : ["lineup", "week", season, week],
    queryFn: async () => {
      if (weekMode === "current") {
        const res = await getCurrentLineup();
        return res.data;
      }
      const res = await getLineupByWeek(season, week);
      return res.data;
    },
    retry: false,
  });

  const playersQuery = useQuery({
    queryKey: ["players", weekMode, season, week],
    queryFn: async () => {
      const res = await getAllPlayers(undefined, {
        season: weekMode === "historical" ? season : undefined,
        week: weekMode === "historical" ? week : undefined,
      });
      return res.data;
    },
  });

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex gap-2 rounded-lg border border-slate-300 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setWeekMode("current")}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              weekMode === "current"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Current
          </button>
          <button
            type="button"
            onClick={() => setWeekMode("historical")}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              weekMode === "historical"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            By week
          </button>
        </div>
        {weekMode === "historical" ? (
          <WeekSelector
            season={season}
            onSeasonChange={setSeason}
            value={week}
            onChange={setWeek}
          />
        ) : null}
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {isQueryBusy(lineupQuery) ? (
          <LoadingPanel label="Loading lineup…" topAligned />
        ) : lineupQuery.isError ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-lg text-slate-700 dark:text-slate-300">No lineup found for Week {week}.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
              No lineup has been seeded for Season {season}, Week {week} yet. You can still
              browse player projections on the right.
            </p>
          </div>
        ) : lineupQuery.data ? (
          <LineupCard
            lineup={lineupQuery.data}
            onPlayerClick={(id) => setSelectedPlayerId(id)}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-lg text-slate-700 dark:text-slate-300">No lineup data for this week.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
              Try another week or check that the API returned a lineup payload.
            </p>
          </div>
        )}
        <PlayerTable
          players={playersQuery.data || []}
          loading={isQueryBusy(playersQuery)}
          onPlayerClick={(id) => setSelectedPlayerId(id)}
        />
      </div>
      {playersQuery.isError ? (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          Could not load player projections. Please refresh and try again.
        </div>
      ) : null}
      <StatsDrawer
        playerId={selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
      />
    </div>
  );
}
