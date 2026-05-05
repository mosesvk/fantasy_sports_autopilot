import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllPlayers, getCurrentLineup, getLineupByWeek } from "../api/client.js";
import LineupCard from "../components/LineupCard.jsx";
import PlayerTable from "../components/PlayerTable.jsx";
import StatsDrawer from "../components/StatsDrawer.jsx";
import WeekSelector from "../components/WeekSelector.jsx";

/**
 * Main dashboard: current or historical lineup plus player table.
 * @param {{ theme: "light" | "dark", onToggleTheme: () => void }} props Component props
 * @returns {JSX.Element}
 */
export default function Dashboard({ theme, onToggleTheme }) {
  const [weekMode, setWeekMode] = useState("current");
  const [season, setSeason] = useState(2025);
  const [week, setWeek] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fantasy Autopilot
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Weekly optimized lineup powered by Sleeper data & Postgres.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? "Dark active (switch to light)" : "Light active (switch to dark)"}
          </button>
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
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {lineupQuery.isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : lineupQuery.isError ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-lg text-slate-700 dark:text-slate-300">No lineup found for Week {week}.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
              No lineup has been seeded for Season {season}, Week {week} yet. You can still
              browse player projections on the right.
            </p>
          </div>
        ) : (
          <LineupCard
            lineup={lineupQuery.data}
            onPlayerClick={(id) => setSelectedPlayerId(id)}
          />
        )}
        <PlayerTable
          players={playersQuery.data || []}
          loading={playersQuery.isLoading}
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
