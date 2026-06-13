import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { HubConnectionConfig } from "../lib/hubClient";

const STORAGE_KEY = "cware-hil-ui:connection";

const DEFAULT_CONFIG: HubConnectionConfig = {
  host: typeof window !== "undefined" ? window.location.hostname || "127.0.0.1" : "127.0.0.1",
  port: 22360,
  token: "",
};

function load(): HubConnectionConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<HubConnectionConfig>;
      return {
        host: v.host ?? DEFAULT_CONFIG.host,
        port: typeof v.port === "number" ? v.port : DEFAULT_CONFIG.port,
        token: v.token ?? "",
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return DEFAULT_CONFIG;
}

interface ConnectionContextValue {
  config: HubConnectionConfig;
  setConfig: (next: HubConnectionConfig) => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<HubConnectionConfig>(load);

  const setConfig = useCallback((next: HubConnectionConfig) => {
    setConfigState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, []);

  const value = useMemo(() => ({ config, setConfig }), [config, setConfig]);
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnection must be used within a ConnectionProvider");
  return ctx;
}
