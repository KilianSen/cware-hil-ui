import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Command, Monitor, Moon, Sun } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { ConnectionProvider } from "./hooks/useConnection";
import { SettingsProvider, useSettings } from "./hooks/useSettings";
import { HubProvider, useHub } from "./hooks/useHub";
import { useHashRoute } from "./hooks/useHashRoute";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { CommandPalette, openCommandPalette } from "./components/CommandPalette";
import { OfflineBanner } from "./components/OfflineBanner";
import { BrandMark } from "./components/BrandMark";
import { Toasts } from "./components/Toasts";
import { Dashboard } from "./pages/Dashboard";
import { History } from "./pages/History";
import { Setup } from "./pages/Setup";
import { VersionFooter } from "./components/VersionFooter";
import { applyTheme } from "./lib/theme";
import { cn } from "./lib/cn";

export function App() {
  return (
    <ConnectionProvider>
      <SettingsProvider>
        <ThemeSync />
        <HubProvider>
          <Shell />
          <CommandPalette />
          <Toasts />
        </HubProvider>
      </SettingsProvider>
    </ConnectionProvider>
  );
}

/** Keeps the document theme in sync with the setting (and the OS, for "system"). */
function ThemeSync() {
  const { settings } = useSettings();
  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings.theme]);
  return null;
}

const NAV = [
  { key: "dashboard", href: "#/", label: "Dashboard" },
  { key: "history", href: "#/history", label: "History" },
  { key: "setup", href: "#/setup", label: "Setup" },
] as const;

function Shell() {
  const route = useHashRoute();
  const onSetup = route.startsWith("/setup");
  const onHistory = route.startsWith("/history");
  const active = onSetup ? "setup" : onHistory ? "history" : "dashboard";

  return (
    <div className="min-h-full font-sans text-ink">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <Header active={active} />
        <OfflineBanner />

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            {onSetup ? <Setup /> : onHistory ? <History /> : <Dashboard />}
          </motion.div>
        </AnimatePresence>

        <VersionFooter />
      </div>
    </div>
  );
}

function Header({ active }: { active: string }) {
  const { questions, agents, enabled, connected } = useHub();

  return (
    <header className="mb-6">
      <div className="hud-corners rounded-xl border border-edge bg-panel/70 backdrop-blur">
        {/* Brand + global controls */}
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <a href="#/" className="flex items-center gap-2.5 rounded-md">
            <BrandMark className="h-6 w-6 shrink-0 text-accent" />
            <span className="flex items-baseline gap-1.5 leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-ink">cware</span>
              <span className="font-mono text-[13px] text-ink-faint">/hitl</span>
            </span>
          </a>

          <div className="flex items-center gap-1.5">
            <ConnectionStatus href="#/setup" />
            <ThemeButton />
            <button
              type="button"
              onClick={openCommandPalette}
              aria-label="Open command palette"
              className="hidden items-center gap-1.5 rounded-md border border-edge bg-well px-2 py-1.5 text-[12px] text-ink-dim transition-colors hover:border-edge-strong hover:text-ink sm:inline-flex"
            >
              <Command className="h-3.5 w-3.5" />
              <kbd className="border-0 bg-transparent p-0 text-ink-faint">K</kbd>
            </button>
            <button
              type="button"
              onClick={openCommandPalette}
              aria-label="Open command palette"
              className="inline-flex items-center rounded-md border border-edge bg-well p-2 text-ink-dim transition-colors hover:text-ink sm:hidden"
            >
              <Command className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status strip + nav */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-edge px-3 py-2 sm:px-4">
          <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              queue
              <span className="tabular-nums text-ink-dim">
                <NumberFlow value={enabled && connected ? questions.length : 0} />
              </span>
              waiting
            </span>
            <span className="text-edge-strong">·</span>
            <span className="inline-flex items-center gap-1.5">
              agents
              <span className="tabular-nums text-ink-dim">
                <NumberFlow value={enabled && connected ? agents.length : 0} />
              </span>
              active
            </span>
          </div>
          <Nav active={active} />
        </div>
      </div>
    </header>
  );
}

function Nav({ active }: { active: string }) {
  return (
    <nav className="flex gap-0.5 rounded-lg border border-edge bg-well p-0.5 text-[13px]">
      {NAV.map((n) => {
        const isActive = n.key === active;
        return (
          <a
            key={n.key}
            href={n.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative rounded-md px-3 py-1 transition-colors",
              isActive ? "text-ink" : "text-ink-dim hover:text-ink",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 -z-0 rounded-md bg-accent/15 ring-1 ring-accent/40"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10">{n.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function ThemeButton() {
  const { settings, update } = useSettings();
  const Icon = settings.theme === "dark" ? Moon : settings.theme === "light" ? Sun : Monitor;
  const next = settings.theme === "system" ? "dark" : settings.theme === "dark" ? "light" : "system";
  return (
    <button
      type="button"
      onClick={() => update({ theme: next })}
      aria-label={`Theme: ${settings.theme}. Switch to ${next}.`}
      title={`Theme: ${settings.theme}`}
      className="inline-flex items-center rounded-md border border-edge bg-well p-2 text-ink-dim transition-colors hover:text-ink"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
