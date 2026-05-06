import { getNflSeasonYearOptions } from "../utils/nflSeasons.js";

/**
 * Simple week selector for historical lineup view.
 * @param {{
 *   value: number,
 *   onChange: (n: number) => void,
 *   season: number,
 *   onSeasonChange: (n: number) => void,
 *   maxWeek?: number
 * }} props Props
 * @returns {JSX.Element}
 */
export default function WeekSelector({
  value,
  onChange,
  season,
  onSeasonChange,
  maxWeek = 18,
}) {
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);
  const seasons = getNflSeasonYearOptions();

  return (
    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
      <label className="flex items-center gap-2">
        <span>Season</span>
        <select
          value={season}
          onChange={(e) => onSeasonChange(Number(e.target.value))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          {seasons.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span>Week</span>
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          {weeks.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
