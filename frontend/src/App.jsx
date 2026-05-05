import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard.jsx";

/**
 * Root layout for the fantasy dashboard SPA.
 * @returns {JSX.Element}
 */
export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  /**
   * Toggle active app theme between light and dark mode.
   * @returns {void}
   */
  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Dashboard theme={theme} onToggleTheme={toggleTheme} />
    </div>
  );
}
