import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import RankingsTab from "./components/RankingsTab.jsx";
import StatsTab from "./components/StatsTab.jsx";
import { NFL_LEAGUE_LOGO_URL_ESPN, NFL_LEAGUE_LOGO_URL_WIKI } from "./utils/media.js";

const TABS = [
  { id: "main", label: "Home" },
  { id: "stats", label: "Stats" },
  { id: "rankings", label: "Rankings" },
];

const TOP_LEAGUES = [
  { id: "nfl", label: "NFL" },
  { id: "nba", label: "NBA" },
];

const SUB_NAV_DECOR = ["Scores", "Schedule", "Standings", "Fantasy"];

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
 * Inline shield used only when remote NFL marks fail to load.
 * @returns {JSX.Element}
 */
function NflShieldFallbackSvg() {
  return (
    <svg viewBox="0 0 48 56" className="h-9 w-8 shrink-0" aria-hidden="true">
      <path fill="#013369" d="M24 2C12 2 4 8 2 18v20c2 12 10 22 22 26 12-4 20-14 22-26V18C46 8 38 2 24 2z" />
      <text
        x="24"
        y="33"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#fff"
        fontSize="13"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        NFL
      </text>
    </svg>
  );
}

/**
 * NFL league shield for the sub-header (remote asset with SVG fallback).
 * @returns {JSX.Element}
 */
function NflLeagueMark() {
  const [step, setStep] = useState(0);

  if (step >= 2) {
    return <NflShieldFallbackSvg />;
  }

  const src = step === 0 ? NFL_LEAGUE_LOGO_URL_ESPN : NFL_LEAGUE_LOGO_URL_WIKI;

  return (
    <img
      src={src}
      alt=""
      width={36}
      height={40}
      className="h-9 w-auto max-h-10 shrink-0 object-contain object-left"
      loading="lazy"
      decoding="async"
      onError={() => setStep((s) => s + 1)}
    />
  );
}

/**
 * Simple NBA mark for the sub-header when the NBA league tab is active.
 * @returns {JSX.Element}
 */
function NbaMark() {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0">
        <circle cx="16" cy="16" r="15" fill="#C8102E" />
        <path
          fill="none"
          stroke="#fff"
          strokeWidth="1.25"
          strokeLinecap="round"
          d="M16 1v30M1 16h30M4.5 8.5c5 4 19 4 24 0M4.5 23.5c5-4 19-4 24 0"
        />
      </svg>
      <span className="text-base font-bold tracking-tight text-[#17408B] dark:text-blue-400">NBA</span>
    </div>
  );
}

/**
 * ESPN-style slanted brand chip for the top bar.
 * @param {{ children: React.ReactNode }} props Brand text inside the chip.
 * @returns {JSX.Element}
 */
function BrandChip({ children }) {
  return (
    <span className="inline-flex -skew-x-6 transform items-center bg-emerald-600 px-2.5 py-1 shadow-sm dark:bg-emerald-500">
      <span className="skew-x-6 transform text-xs font-extrabold uppercase tracking-tight text-white sm:text-sm">
        {children}
      </span>
    </span>
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
  const [activeLeague, setActiveLeague] = useState(/** @type {"nfl" | "nba"} */ ("nfl"));

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
        <header className="sticky top-0 z-50 shadow-sm">
          {/* Tier 1 — global bar (ESPN-style) */}
          <div className="border-b border-black/20 bg-[#1d1e1f] text-white">
            <div className="mx-auto flex max-w-[1320px] items-center gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
              <div className="flex min-w-0 flex-1 items-center gap-5 lg:gap-8">
                <div className="flex shrink-0 items-center gap-2">
                  <BrandChip>MVK</BrandChip>
                  <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:inline">
                    Fantasy Autopilot
                  </span>
                </div>
                <nav
                  className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm font-medium sm:gap-2"
                  aria-label="Sports"
                >
                  {TOP_LEAGUES.map((item) => {
                    const isOn = activeLeague === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveLeague(item.id)}
                        className={`shrink-0 rounded px-2.5 py-1 transition-colors ${
                          isOn
                            ? "font-bold text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 rounded border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white/90 hover:bg-white/10"
                  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                >
                  <span className={theme === "light" ? "text-amber-300" : "text-slate-400"}>
                    <SunIcon />
                  </span>
                  <span className={theme === "dark" ? "text-blue-300" : "text-slate-400"}>
                    <MoonIcon />
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Tier 2 — section nav */}
          <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <div className="flex min-w-0 flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 border-slate-200 pr-4 dark:border-slate-700 sm:border-r">
                  {activeLeague === "nfl" ? (
                    <>
                      <NflLeagueMark />
                      <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                        NFL
                      </span>
                    </>
                  ) : (
                    <NbaMark />
                  )}
                </div>
                <nav
                  className="flex flex-wrap items-center gap-1 sm:gap-0"
                  aria-label="Main navigation"
                >
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative px-3 py-2 text-sm font-semibold transition-colors ${
                          isActive
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        {tab.label}
                        {isActive ? (
                          <span
                            className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                  {activeLeague === "nfl"
                    ? SUB_NAV_DECOR.map((label) => (
                        <span
                          key={label}
                          className="hidden cursor-default px-3 py-2 text-sm text-slate-400 lg:inline dark:text-slate-600"
                          aria-hidden="true"
                        >
                          {label}
                        </span>
                      ))
                    : null}
                </nav>
              </div>
              <p className="max-w-md text-right text-xs leading-snug text-slate-500 dark:text-slate-400">
                Weekly optimized lineup · Sleeper &amp; Postgres
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1320px] px-5 py-6 sm:px-6 lg:px-8">
          {activeTab === "main" ? <Dashboard /> : null}
          {activeTab === "stats" ? <StatsTab /> : null}
          {activeTab === "rankings" ? <RankingsTab /> : null}
        </main>
      </div>
    </div>
  );
}
