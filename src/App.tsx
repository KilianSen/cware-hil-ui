import { ConnectionProvider } from "./hooks/useConnection";
import { HubProvider } from "./hooks/useHub";
import { useHashRoute } from "./hooks/useHashRoute";
import { ConnectionBar } from "./components/ConnectionBar";
import { Toasts } from "./components/Toasts";
import { Dashboard } from "./pages/Dashboard";
import { Setup } from "./pages/Setup";

export function App() {
  return (
    <ConnectionProvider>
      <HubProvider>
        <Shell />
        <Toasts />
      </HubProvider>
    </ConnectionProvider>
  );
}

function Shell() {
  const route = useHashRoute();
  const onSetup = route.startsWith("/setup");

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-5">
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl font-semibold">Human-in-the-loop hub</h1>
            <nav className="flex gap-1 text-sm">
              <NavLink href="#/" active={!onSetup}>
                Dashboard
              </NavLink>
              <NavLink href="#/setup" active={onSetup}>
                Setup
              </NavLink>
            </nav>
          </div>
        </header>

        <div className="mb-6">
          <ConnectionBar />
        </div>

        {onSetup ? <Setup /> : <Dashboard />}
      </div>
    </div>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={
        "rounded-md px-3 py-1.5 transition-colors " +
        (active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100")
      }
    >
      {children}
    </a>
  );
}
