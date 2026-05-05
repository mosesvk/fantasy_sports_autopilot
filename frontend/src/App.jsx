import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import RankingsTab from "./components/RankingsTab.jsx";
import StatsTab from "./components/StatsTab.jsx";

const TABS = [
  { id: "main", label: "Main" },
  { id: "stats", label: "Stats" },
  { id: "rankings", label: "Rankings" },
];

/**
 * Renders a sun icon for light mode actions.
 * @returns {JSX.Element}
 */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 3v2.25M12 18.75V21M5.636 5.636l1.591 1.591M16.773 16.773l1.591 1.591M3 12h2.25M18.75 12H21M5.636 18.364l1.591-1.591M16.773 7.227l1.591-1.591M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Renders a moon icon for dark mode actions.
 * @returns {JSX.Element}
 */
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Root layout for the fantasy dashboard SPA.
 * @returns {JSX.Element}
 */
export default function App() {
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
    return "light";
  });
  const [activeTab, setActiveTab] = useState("main");

  /**
   * Toggle active app theme between light and dark mode.
   * @returns {void}
   */
  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.style.backgroundColor = isDark ? "#020617" : "#ffffff";
    document.body.style.backgroundColor = isDark ? "#020617" : "#ffffff";
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className={theme === "dark" ? "dark" : ""} data-theme={theme}>
      <div className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <div className="fixed right-4 top-4 z-40 sm:right-6 sm:top-6">
          <button
            type="button"
            onClick={toggleTheme}
            className="group flex items-center gap-2 rounded-full border border-slate-300/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <span
              className={`rounded-full p-1 ${theme === "light" ? "bg-amber-100 text-amber-600" : "text-slate-500 dark:text-slate-400"}`}
            >
              <SunIcon />
            </span>
            <span
              className={`rounded-full p-1 ${theme === "dark" ? "bg-blue-950 text-blue-300" : "text-slate-500"}`}
            >
              <MoonIcon />
            </span>
          </button>
        </div>

        <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-6 lg:px-8">
          <header className="mb-8 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div className="mb-4">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Fantasy Autopilot
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Weekly optimized lineup powered by Sleeper data & Postgres.
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </header>

          {activeTab === "main" ? <Dashboard /> : null}
          {activeTab === "stats" ? <StatsTab /> : null}
          {activeTab === "rankings" ? <RankingsTab /> : null}
        </div>
      </div>
    </div>
  );
}
