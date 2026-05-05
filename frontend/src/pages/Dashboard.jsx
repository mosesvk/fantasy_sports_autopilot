import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllPlayers, getCurrentLineup, getLineupByWeek } from "../api/client.js";
import LineupCard from "../components/LineupCard.jsx";
import PlayerTable from "../components/PlayerTable.jsx";
import StatsDrawer from "../components/StatsDrawer.jsx";
import WeekSelector from "../components/WeekSelector.jsx";

/**
 * Main dashboard: current or historical lineup plus player table.
 * @returns {JSX.Element}
 */
export default function Dashboard() {
  const [weekMode, setWeekMode] = useState("current");
  const [week, setWeek] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const lineupQuery = useQuery({
    queryKey:
      weekMode === "current" ? ["lineup", "current"] : ["lineup", "week", week],
    queryFn: async () => {
      if (weekMode === "current") {
        const res = await getCurrentLineup();
        return res.data;
      }
      const res = await getLineupByWeek(week);
      return res.data;
    },
    retry: false,
  });

  const playersQuery = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const res = await getAllPlayers();
      return res.data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Fantasy Autopilot
          </h1>
          <p className="mt-2 text-slate-400">
            Weekly optimized lineup powered by Sleeper data & Postgres.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setWeekMode("current")}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                weekMode === "current"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
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
                  : "text-slate-400 hover:text-white"
              }`}
            >
              By week
            </button>
          </div>
          {weekMode === "historical" ? (
            <WeekSelector value={week} onChange={setWeek} />
          ) : null}
        </div>
      </header>

      {lineupQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : lineupQuery.isError ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-12 text-center">
          <p className="text-slate-400 text-lg">No lineup found for Week {week}.</p>
          <p className="text-slate-500 text-sm mt-2">
            Only Week 18 · 2025 has been seeded. The optimizer runs every Tuesday.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <LineupCard lineup={lineupQuery.data} />
          <PlayerTable
            players={playersQuery.data || []}
            loading={playersQuery.isLoading}
            onPlayerClick={(id) => setSelectedPlayerId(id)}
          />
        </div>
      )}
      <StatsDrawer
        playerId={selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
      />
    </div>
  );
}
