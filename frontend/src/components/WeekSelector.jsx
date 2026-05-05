/**
 * Simple week selector for historical lineup view.
 * @param {{ value: number, onChange: (n: number) => void, maxWeek?: number }} props Props
 * @returns {JSX.Element}
 */
export default function WeekSelector({ value, onChange, maxWeek = 18 }) {
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <span>Week</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
      >
        {weeks.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>
    </label>
  );
}
