import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Command, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { ConnectionProvider, useConnection } from "./hooks/useConnection";
import { SettingsProvider, useSettings } from "./hooks/useSettings";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { HubProvider } from "./hooks/useHub";
import { useHashRoute } from "./hooks/useHashRoute";
import { Onboarding } from "./pages/Onboarding";
import { SignIn } from "./pages/SignIn";
import { Loader2 } from "lucide-react";
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
        <AuthProvider>
          <HubProvider>
            <Gate />
          </HubProvider>
        </AuthProvider>
      </SettingsProvider>
    </ConnectionProvider>
  );
}

/**
 * Routes to the right entry screen based on the hub's auth mode:
 *   - loading: still resolving /config.
 *   - oidc:    sign-in until a user is present, then the dashboard.
 *   - token:   first-run onboarding until a token is configured, then the dashboard.
 *
 * Token-mode gating is purely on token presence, so a failing-but-configured
 * connection stays on the dashboard (Setup surfaces the reachability hint).
 */
function Gate() {
  const { mode, user } = useAuth();
  const { config } = useConnection();

  if (mode === "loading") return <FullScreenSpinner />;
  if (mode === "oidc" && !user) return <SignIn />;
  if (mode === "token" && config.token.trim().length === 0) return <Onboarding />;

  return (
    <>
      <Shell />
      <CommandPalette />
      <Toasts />
    </>
  );
}

function FullScreenSpinner() {
  return (
    <div className="text-muted-foreground flex min-h-full items-center justify-center">
      <Loader2 className="size-5 animate-spin" />
    </div>
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
    <header className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-b pb-4">
      <a href="#/" className="group flex items-center gap-2.5 rounded-md">
        <span className="bg-primary/10 text-primary ring-primary/25 flex size-9 items-center justify-center rounded-xl ring-1 transition-colors group-hover:bg-primary/15">
          <BrandMark className="size-5" />
        </span>
        <span className="flex flex-col leading-none">
          <span className="flex items-baseline gap-1">
            <span className="text-[15px] font-semibold tracking-tight">cware</span>
            <span className="text-muted-foreground font-mono text-xs">hitl</span>
          </span>
          <span className="text-muted-foreground/80 mt-1 text-[10.5px] tracking-wide">
            human-in-the-loop
          </span>
        </span>
      </a>

      <Nav active={active} />

      <div className="ml-auto flex items-center gap-1">
        <ConnectionStatus href="#/setup" />
        <UserMenu />
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

/** Signed-in user + sign-out, shown only in OIDC (multi-user) mode. */
function UserMenu() {
  const { mode, user, signOut } = useAuth();
  if (mode !== "oidc" || !user) return null;
  const who = user.email ?? user.name ?? user.subject ?? "signed in";
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground hidden max-w-[160px] truncate text-xs sm:inline" title={who}>
        {who}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={signOut}
        aria-label="Sign out"
        title="Sign out"
        className="text-muted-foreground"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
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
