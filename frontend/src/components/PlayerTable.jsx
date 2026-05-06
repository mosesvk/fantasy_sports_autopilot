import { useEffect, useMemo, useState } from "react";
import LoadingPanel from "./LoadingPanel.jsx";
import { getPlayerHeadshotUrl, getTeamLogoUrl } from "../utils/media.js";

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
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

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

  /**
   * Toggle sorting for a selected key, preserving default direction by data type.
   * @param {string} key Column key to sort by.
   * @returns {void}
   */
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "projected_points" ? "desc" : "asc");
    }
  };

  useEffect(() => {
    setPage(1);
  }, [query, position, sortKey, sortDir, players]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const rowsForPage = filtered.slice(start, end);

  /**
   * Set the table page while keeping it within valid bounds.
   * @param {number} nextPage Requested page index (1-based).
   * @returns {void}
   */
  const setPageWithinBounds = (nextPage) => {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
  };

  /**
   * Handle image load failure by hiding broken remote assets.
   * @param {React.SyntheticEvent<HTMLImageElement>} event Image error event.
   * @returns {void}
   */
  const hideBrokenImage = (event) => {
    event.currentTarget.style.display = "none";
  };

  if (loading) {
    return <LoadingPanel label="Loading players…" topAligned />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">All players</h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 sm:w-56"
          />
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
        <table className="min-w-full text-left text-base">
          <thead>
            <tr className="border-b border-slate-200 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="py-3 pr-4">
                <button
                  type="button"
                  className="hover:text-slate-900 dark:hover:text-white"
                  onClick={() => toggleSort("name")}
                >
                  Player
                </button>
              </th>
              <th className="py-3 pr-4">
                <button
                  type="button"
                  className="hover:text-slate-900 dark:hover:text-white"
                  onClick={() => toggleSort("position")}
                >
                  Pos
                </button>
              </th>
              <th className="py-3 pr-4">
                <button
                  type="button"
                  className="hover:text-slate-900 dark:hover:text-white"
                  onClick={() => toggleSort("team")}
                >
                  Team
                </button>
              </th>
              <th className="py-3 text-right">
                <button
                  type="button"
                  className="hover:text-slate-900 dark:hover:text-white"
                  onClick={() => toggleSort("projected_points")}
                >
                  Proj Pts
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rowsForPage.length ? (
              rowsForPage.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-950/60"
                  onClick={() => onPlayerClick?.(p.id)}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={getPlayerHeadshotUrl(p.sleeper_id) ?? undefined}
                        alt={`${p.name} headshot`}
                        className="h-10 w-10 shrink-0 rounded-full border-2 border-slate-300 object-cover dark:border-slate-600 sm:h-11 sm:w-11"
                        loading="lazy"
                        onError={hideBrokenImage}
                      />
                      <span className="font-semibold text-slate-900 dark:text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">{p.position}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={getTeamLogoUrl(p.team) ?? undefined}
                        alt={p.team ? `${p.team} logo` : "No team"}
                        className="h-9 w-9 shrink-0 rounded-sm object-contain sm:h-10 sm:w-10"
                        loading="lazy"
                        onError={hideBrokenImage}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{p.team ?? "—"}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    {p.projected_points != null ? (
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {p.projected_points.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500 dark:text-slate-500">
                  No players match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing {totalRows === 0 ? 0 : start + 1}-{Math.min(end, totalRows)} of {totalRows}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPageWithinBounds(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
          >
            Prev
          </button>
          <span className="text-slate-700 dark:text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPageWithinBounds(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
