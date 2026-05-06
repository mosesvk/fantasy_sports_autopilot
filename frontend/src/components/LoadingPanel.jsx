/**
 * Card-style loading state with centered spinner, matching dashboard column shells.
 * @param {{ label?: string }} props Display label under the spinner (also used for accessibility).
 * @returns {JSX.Element}
 */
export default function LoadingPanel({ label = "Loading…" }) {
  return (
    <div
      className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-20 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-lg dark:shadow-blue-950/40"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
        aria-hidden
      />
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}
