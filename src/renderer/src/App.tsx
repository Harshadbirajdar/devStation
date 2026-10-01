import { useCallback, useEffect, useState } from "react";
import { Code2, FolderGit2, Gauge, RefreshCw } from "lucide-react";
import type { ConfigResult } from "../../shared/types";
import zebraLogo from "./assets/zebra-logo-white.png";
import HealthCheckPage from "./components/HealthCheckPage";
import ProjectList from "./components/ProjectList";
import ScriptsPage from "./components/ScriptsPage";
import SplashScreen from "./components/SplashScreen";
import TerminalPanel from "./components/TerminalPanel";

type Tab = "health" | "projects" | "scripts";

const SPLASH_MIN_MS = 5000;
const SPLASH_MAX_MS = 5500;
const SPLASH_FADE_MS = 500;

const NAV_ITEMS: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: "health", label: "Health Check", icon: Gauge },
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "scripts", label: "Scripts", icon: Code2 },
];

const TAB_SUBTITLES: Record<Tab, string> = {
  health: "Verify your machine has the required tools and versions installed.",
  projects: "Run the setup steps for a project on this machine.",
  scripts: "Run shared utility scripts kept up to date in the config.",
};

function App(): JSX.Element {
  const [configResult, setConfigResult] = useState<ConfigResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("health");
  const [logLines, setLogLines] = useState<string[]>([]);

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [forceElapsed, setForceElapsed] = useState(false);
  const [splashFading, setSplashFading] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const appendLog = useCallback((line: string) => {
    setLogLines((prev) => [...prev, line]);
  }, []);

  const clearLogs = useCallback(() => setLogLines([]), []);

  const loadConfig = useCallback(() => {
    return window.api
      .getConfig()
      .then((result) => {
        setConfigResult(result);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConfig();
    setRefreshing(false);
  }, [loadConfig]);

  // Splash stays up for at least SPLASH_MIN_MS and until the config has
  // loaded (so it never looks fake-slow or hides a real loading delay),
  // but never longer than SPLASH_MAX_MS even if the config fetch stalls.
  useEffect(() => {
    const minTimer = setTimeout(() => setMinTimeElapsed(true), SPLASH_MIN_MS);
    const maxTimer = setTimeout(() => setForceElapsed(true), SPLASH_MAX_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  const configReady = configResult !== null || error !== null;

  useEffect(() => {
    if (splashFading) return undefined;
    if (forceElapsed || (configReady && minTimeElapsed)) {
      setSplashFading(true);
      const timer = setTimeout(() => setSplashVisible(false), SPLASH_FADE_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [configReady, minTimeElapsed, forceElapsed, splashFading]);

  const activeNav = NAV_ITEMS.find((item) => item.id === tab)!;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <img src={zebraLogo} alt="" className="sidebar-brand-logo" />
          </div>
          <span className="sidebar-brand-text">Dev Station</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${tab === item.id ? "active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                <Icon size={16} strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {configResult && (
            <div className="sidebar-footer-row">
              <span>Config v{configResult.config.version}</span>
              <span className="sidebar-footer-actions">
                <span className={`source-pill ${configResult.source}`}>
                  {configResult.source === "network" ? "Live" : "Cached"}
                </span>
                <button
                  className="icon-btn"
                  title="Refresh config"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw size={12} className={refreshing ? "spin" : ""} />
                </button>
              </span>
            </div>
          )}
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <div className="topbar-title">{activeNav.label}</div>
            <div className="topbar-subtitle">{TAB_SUBTITLES[tab]}</div>
          </div>
        </header>

        {configResult?.source === "cache" && (
          <div className="banner">
            Offline or unreachable — showing cached config from{" "}
            {configResult.cachedAt ?? "unknown date"}.
          </div>
        )}
        {error && (
          <div className="banner banner-error">
            Failed to load config: {error}
          </div>
        )}

        <main className="app-main">
          {!configResult && !error && (
            <p className="loading-state">Loading config…</p>
          )}
          {configResult && tab === "health" && (
            <HealthCheckPage
              prerequisites={configResult.config.prerequisites}
              onLog={appendLog}
            />
          )}
          {configResult && tab === "projects" && (
            <ProjectList
              projects={configResult.config.projects}
              onLog={appendLog}
            />
          )}
          {configResult && tab === "scripts" && (
            <ScriptsPage
              scripts={configResult.config.scripts ?? []}
              onLog={appendLog}
            />
          )}
        </main>

        <TerminalPanel lines={logLines} onClear={clearLogs} />
      </div>

      {splashVisible && <SplashScreen fadingOut={splashFading} />}
    </div>
  );
}

export default App;
