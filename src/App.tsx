import { AnimatePresence, motion } from "motion/react";
import { Bot } from "lucide-react";
import { ConnectionProvider } from "./hooks/useConnection";
import { SettingsProvider } from "./hooks/useSettings";
import { HubProvider } from "./hooks/useHub";
import { useHashRoute } from "./hooks/useHashRoute";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { Toasts } from "./components/Toasts";
import { Dashboard } from "./pages/Dashboard";
import { History } from "./pages/History";
import { Setup } from "./pages/Setup";
import { VersionFooter } from "./components/VersionFooter";
import { cn } from "./lib/cn";

export function App() {
  return (
    <ConnectionProvider>
      <SettingsProvider>
        <HubProvider>
          <Shell />
          <Toasts />
        </HubProvider>
      </SettingsProvider>
    </ConnectionProvider>
  );
}

function Shell() {
  const route = useHashRoute();
  const onSetup = route.startsWith("/setup");
  const onHistory = route.startsWith("/history");
  const key = onSetup ? "setup" : onHistory ? "history" : "dashboard";

  return (
    <div className="min-h-full font-sans text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Bot className="h-5 w-5 self-center text-violet-400" />
              Human-in-the-loop hub
            </h1>
            <div className="flex items-center gap-2">
              <ConnectionStatus href="#/setup" />
              <nav className="flex gap-1 text-sm">
                <NavLink href="#/" active={!onSetup && !onHistory}>
                  Dashboard
                </NavLink>
                <NavLink href="#/history" active={onHistory}>
                  History
                </NavLink>
                <NavLink href="#/setup" active={onSetup}>
                  Setup
                </NavLink>
              </nav>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={key}
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

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={cn(
        "relative rounded-md px-3 py-1.5 transition-colors",
        active ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-100",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 -z-0 rounded-md bg-zinc-800"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </a>
  );
}
