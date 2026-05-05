const CHAMPIONSHIP_HISTORY = [
  { season: 2025, champion: "Buffalo Bills", runnerUp: "San Francisco 49ers" },
  { season: 2024, champion: "Kansas City Chiefs", runnerUp: "Philadelphia Eagles" },
  { season: 2023, champion: "Kansas City Chiefs", runnerUp: "San Francisco 49ers" },
  { season: 2022, champion: "Kansas City Chiefs", runnerUp: "Philadelphia Eagles" },
  { season: 2021, champion: "Los Angeles Rams", runnerUp: "Cincinnati Bengals" },
  { season: 2020, champion: "Tampa Bay Buccaneers", runnerUp: "Kansas City Chiefs" },
];

/**
 * Renders championship ranking history in a bracket-style card layout.
 * @returns {JSX.Element}
 */
export default function RankingsTab() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          NFL Championship Rankings
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Previous seasons with title winners and runners-up.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CHAMPIONSHIP_HISTORY.map((entry) => (
          <article
            key={entry.season}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Season {entry.season}
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Champion
              </span>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">
              {entry.champion}
            </div>
            <div className="my-2 h-px bg-slate-300 dark:bg-slate-700" />
            <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              Runner-up: {entry.runnerUp}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
