import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { HubConnectionConfig } from "../lib/hubClient";
import { readPairingFromUrl, stripPairingFromUrl } from "../lib/pairing";

const STORAGE_KEY = "cware-hil-ui:connection";

const DEFAULT_CONFIG: HubConnectionConfig = {
  host: typeof window !== "undefined" ? window.location.hostname || "127.0.0.1" : "127.0.0.1",
  port: 22360,
  token: "",
};

/**
 * Token injected by the deployment at runtime (Docker writes runtime-config.js
 * from CC_HITL_TOKEN). Empty in dev / when the env var is unset. Used to
 * auto-populate the token field on first load.
 */
function injectedToken(): string {
  if (typeof window === "undefined") return "";
  const t = (window as unknown as { __CC_HITL_TOKEN__?: unknown }).__CC_HITL_TOKEN__;
  return typeof t === "string" ? t : "";
}

function load(): HubConnectionConfig {
  // A pairing URL (scanned from another device's QR code) wins over everything:
  // it's an explicit, fresh handoff of host / port / token.
  const paired = readPairingFromUrl();
  if (paired) return paired;

  const injected = injectedToken();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<HubConnectionConfig>;
      return {
        host: v.host ?? DEFAULT_CONFIG.host,
        port: typeof v.port === "number" ? v.port : DEFAULT_CONFIG.port,
        // Prefer a token the user already entered; otherwise fall back to the
        // deployment-injected one so the field is pre-filled.
        token: v.token || injected,
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { ...DEFAULT_CONFIG, token: injected };
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

  // If we booted from a pairing URL, persist that config and clear the token out
  // of the address bar so it isn't left lingering / re-applied on reload.
  useEffect(() => {
    if (readPairingFromUrl()) {
      setConfig(config);
      stripPairingFromUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ config, setConfig }), [config, setConfig]);
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnection must be used within a ConnectionProvider");
  return ctx;
}
