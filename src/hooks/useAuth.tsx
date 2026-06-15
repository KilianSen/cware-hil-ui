import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useConnection } from "./useConnection";
import { fetchHubConfig, type OIDCPublicConfig } from "../lib/config";
import { hubHttpBase } from "../lib/pairing";

/**
 * Authentication mode + state for the **backend (BFF) OIDC flow**.
 *
 *   - "loading": still fetching the hub's /config.
 *   - "token":   single-user mode — the existing bearer-token onboarding applies.
 *   - "oidc":    multi-user mode — the hub is the confidential OIDC client. The
 *                browser never holds tokens: sign-in is a full-page redirect to
 *                the hub's /auth/login, and an httpOnly session cookie carries
 *                auth thereafter. We just ask /auth/me who's signed in.
 */
export type AuthMode = "loading" | "token" | "oidc";

/** The signed-in user, as reported by GET /auth/me (the lib Identity shape). */
export interface AuthUser {
  subject?: string;
  email?: string;
  name?: string;
  admin: boolean;
}

interface AuthContextValue {
  mode: AuthMode;
  oidc: OIDCPublicConfig | null;
  user: AuthUser | null;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { config } = useConnection();
  const [mode, setMode] = useState<AuthMode>("loading");
  const [oidc, setOidc] = useState<OIDCPublicConfig | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const base = hubHttpBase({ host: config.host, port: config.port });

  // Resolve the hub's auth mode (and current user, in OIDC mode) once per target
  // hub. OIDC config is global to the hub, so this only re-runs if it changes.
  useEffect(() => {
    let cancelled = false;
    setMode("loading");
    fetchHubConfig({ host: config.host, port: config.port })
      .then(async (cfg) => {
        if (cancelled) return;
        setOidc(cfg);
        if (!cfg.enabled) {
          setMode("token");
          return;
        }
        // Cookie-authenticated; 401 just means "not signed in yet".
        try {
          const resp = await fetch(`${base}/auth/me`, { credentials: "include" });
          setUser(resp.ok ? ((await resp.json()) as AuthUser) : null);
        } catch {
          setUser(null);
        }
        if (!cancelled) setMode("oidc");
      })
      .catch(() => {
        if (!cancelled) setMode("token");
      });
    return () => {
      cancelled = true;
    };
  }, [config.host, config.port, base]);

  const signIn = useCallback(() => {
    // Full-page redirect; the hub drives the OIDC dance and redirects back.
    window.location.assign(`${base}/auth/login`);
  }, [base]);

  const signOut = useCallback(() => {
    fetch(`${base}/auth/logout`, { method: "POST", credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((data: { endSessionUrl?: string }) => {
        setUser(null);
        if (data.endSessionUrl) window.location.assign(data.endSessionUrl);
        else window.location.reload();
      });
  }, [base]);

  const value = useMemo<AuthContextValue>(
    () => ({ mode, oidc, user, signIn, signOut }),
    [mode, oidc, user, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
