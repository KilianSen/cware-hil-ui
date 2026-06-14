import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Command, Monitor, Moon, Sun } from "lucide-react";
import { ConnectionProvider } from "./hooks/useConnection";
import { SettingsProvider, useSettings } from "./hooks/useSettings";
import { HubProvider } from "./hooks/useHub";
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-full">
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
  return (
    <header className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-3 border-b pb-4">
      <a href="#/" className="flex items-center gap-2 rounded-md">
        <BrandMark className="text-foreground size-5 shrink-0" />
        <span className="flex items-baseline gap-1 leading-none">
          <span className="font-semibold tracking-tight">cware</span>
          <span className="text-muted-foreground text-sm">/hitl</span>
        </span>
      </a>

      <Nav active={active} />

      <div className="ml-auto flex items-center gap-1">
        <ConnectionStatus href="#/setup" />
        <ThemeButton />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={openCommandPalette}
          aria-label="Open command palette"
          className="text-muted-foreground"
        >
          <Command className="size-4" />
        </Button>
      </div>
    </header>
  );
}

function Nav({ active }: { active: string }) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {NAV.map((n) => {
        const isActive = n.key === active;
        return (
          <a
            key={n.key}
            href={n.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative rounded-md px-3 py-1.5 transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="nav-active"
                className="bg-muted absolute inset-0 -z-0 rounded-md"
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
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => update({ theme: next })}
      aria-label={`Theme: ${settings.theme}. Switch to ${next}.`}
      title={`Theme: ${settings.theme}`}
      className="text-muted-foreground"
    >
      <Icon className="size-4" />
    </Button>
  );
}
