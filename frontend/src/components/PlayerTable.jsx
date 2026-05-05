import { useMemo, useState } from "react";

/**
 * Sortable, filterable player table.
 * @param {{
 *   players: Array<{ id: number; name: string; position: string; team: string | null; projected_points?: number | null }>,
 *   loading?: boolean,
 *   onPlayerClick?: (playerId: number) => void
 * }} props Props
 * @returns {JSX.Element}
 */
export default function PlayerTable({ players, loading, onPlayerClick }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("");
  const [sortKey, setSortKey] = useState("projected_points");
  const [sortDir, setSortDir] = useState("desc");

  const filtered = useMemo(() => {
    let rows = players || [];
    if (position) {
      rows = rows.filter((p) => p.position === position);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? (sortKey === "projected_points" ? 0 : "");
      const bv = b[sortKey] ?? (sortKey === "projected_points" ? 0 : "");
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [players, query, position, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "projected_points" ? "desc" : "asc");
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-white">All players</h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name..."
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 sm:w-56"
          />
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="">All positions</option>
            {["QB", "RB", "WR", "TE", "K", "DEF"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-2 pr-4">
                <button
                  type="button"
                  className="hover:text-white"
                  onClick={() => toggleSort("name")}
                >
                  Player
                </button>
              </th>
              <th className="py-2 pr-4">
                <button
                  type="button"
                  className="hover:text-white"
                  onClick={() => toggleSort("position")}
                >
                  Pos
                </button>
              </th>
              <th className="py-2 pr-4">
                <button
                  type="button"
                  className="hover:text-white"
                  onClick={() => toggleSort("team")}
                >
                  Team
                </button>
              </th>
              <th className="py-2 text-right">
                <button
                  type="button"
                  className="hover:text-white"
                  onClick={() => toggleSort("projected_points")}
                >
                  Proj Pts
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  Loading players...
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-slate-900/80 text-slate-200 hover:bg-slate-950/60"
                  onClick={() => onPlayerClick?.(p.id)}
                >
                  <td className="py-2 pr-4 font-medium">{p.name}</td>
                  <td className="py-2 pr-4">{p.position}</td>
                  <td className="py-2 pr-4">{p.team ?? "—"}</td>
                  <td className="py-2 text-right">
                    {p.projected_points != null ? (
                      <span className="font-medium text-blue-400">
                        {p.projected_points.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
