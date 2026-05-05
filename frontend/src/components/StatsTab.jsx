import { useMemo, useState } from "react";

const LEADER_CATEGORIES = [
  { id: "passing", label: "Passing" },
  { id: "rushing", label: "Rushing" },
  { id: "sacks", label: "Sacks" },
  { id: "tackles", label: "Tackles" },
];

const LEADERS_BY_CATEGORY = {
  passing: [
    { rank: 1, player: "Matthew Stafford", team: "LAR", value: "4,707 yds" },
    { rank: 2, player: "Jared Goff", team: "DET", value: "4,564 yds" },
    { rank: 3, player: "Dak Prescott", team: "DAL", value: "4,552 yds" },
    { rank: 4, player: "Drake Maye", team: "NE", value: "4,394 yds" },
    { rank: 5, player: "Sam Darnold", team: "SEA", value: "4,048 yds" },
  ],
  rushing: [
    { rank: 1, player: "James Cook", team: "BUF", value: "1,621 yds" },
    { rank: 2, player: "Derrick Henry", team: "BAL", value: "1,595 yds" },
    { rank: 3, player: "Jonathan Taylor", team: "IND", value: "1,585 yds" },
    { rank: 4, player: "Bijan Robinson", team: "ATL", value: "1,478 yds" },
    { rank: 5, player: "De'Von Achane", team: "MIA", value: "1,350 yds" },
  ],
  sacks: [
    { rank: 1, player: "Myles Garrett", team: "CLE", value: "23.0 sacks" },
    { rank: 2, player: "Brian Burns", team: "NYG", value: "16.5 sacks" },
    { rank: 3, player: "Danielle Hunter", team: "HOU", value: "15.0 sacks" },
    { rank: 4, player: "Aidan Hutchinson", team: "DET", value: "14.5 sacks" },
    { rank: 5, player: "Nik Bonitto", team: "DEN", value: "14.0 sacks" },
  ],
  tackles: [
    { rank: 1, player: "Jordyn Brooks", team: "MIA", value: "183 tackles" },
    { rank: 2, player: "Jack Campbell", team: "DET", value: "177 tackles" },
    { rank: 3, player: "Devin White", team: "LV", value: "174 tackles" },
    { rank: 4, player: "Cedric Gray", team: "TEN", value: "164 tackles" },
    { rank: 5, player: "Bobby Wagner", team: "WSH", value: "162 tackles" },
  ],
};

/**
 * Renders the league-leaders stats tab with category toggles.
 * @returns {JSX.Element}
 */
export default function StatsTab() {
  const [activeCategory, setActiveCategory] = useState("passing");

  const currentLeaders = useMemo(
    () => LEADERS_BY_CATEGORY[activeCategory] ?? [],
    [activeCategory],
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">NFL League Leaders</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Toggle categories to compare top performers.
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
          2025 Season
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {LEADER_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeCategory === category.id
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 text-left dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-950/70">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3 text-right">Leader Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {currentLeaders.map((leader) => (
              <tr
                key={`${activeCategory}-${leader.rank}-${leader.player}`}
                className="text-slate-700 dark:text-slate-200"
              >
                <td className="px-4 py-3 font-semibold">{leader.rank}</td>
                <td className="px-4 py-3 font-medium">{leader.player}</td>
                <td className="px-4 py-3">{leader.team}</td>
                <td className="px-4 py-3 text-right font-semibold text-blue-700 dark:text-blue-300">
                  {leader.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
