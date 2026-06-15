import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { User, UserManager, WebStorageStateStore } from "oidc-client-ts";
import { useConnection } from "./useConnection";
import { fetchHubConfig, type OIDCPublicConfig } from "../lib/config";

/**
 * Authentication mode + state.
 *
 *   - "loading": still fetching the hub's /config.
 *   - "token":   single-user mode — the existing bearer-token onboarding applies;
 *                this provider stays out of the way.
 *   - "oidc":    multi-user mode — humans sign in via the configured OIDC issuer
 *                (Authorization Code + PKCE, handled by oidc-client-ts). The ID
 *                token is sent to the hub on the bridge `hello`.
 */
export type AuthMode = "loading" | "token" | "oidc";

interface AuthContextValue {
  mode: AuthMode;
  oidc: OIDCPublicConfig | null;
  /** The signed-in OIDC user (oidc mode only), or null. */
  user: User | null;
  signIn: () => void;
  signOut: () => void;
  /** Latest (auto-renewed) ID token for the bridge `hello`; null if signed out. */
  getIdToken: () => Promise<string | null>;
  /** A transient sign-in error, if the redirect callback failed. */
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const REDIRECT_URI = () => window.location.origin + window.location.pathname;

function buildManager(cfg: OIDCPublicConfig): UserManager {
  return new UserManager({
    authority: cfg.issuer!,
    client_id: cfg.clientId!,
    redirect_uri: REDIRECT_URI(),
    response_type: "code",
    // offline_access requests a refresh token, so renewal is a direct
    // token-endpoint call — no hidden iframe or silent-callback page.
    scope: "openid profile email offline_access",
    // Auto-renew the token shortly before it expires (and on demand via
    // getIdToken). If the issuer doesn't grant refresh tokens, renewal fails
    // gracefully and the session drops to the sign-in screen on expiry.
    automaticSilentRenew: true,
    accessTokenExpiringNotificationTimeInSeconds: 60,
    // Survive reloads / multiple tabs.
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  });
}

/** True if the current URL is an OIDC redirect callback (has ?code & ?state). */
function isRedirectCallback(): boolean {
  const q = new URLSearchParams(window.location.search);
  return q.has("code") && q.has("state");
}

function stripQuery(): void {
  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState(null, "", `${url.pathname}${url.hash}`);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { config } = useConnection();
  const [mode, setMode] = useState<AuthMode>("loading");
  const [oidc, setOidc] = useState<OIDCPublicConfig | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mgrRef = useRef<UserManager | null>(null);

  // Resolve auth mode from the hub once (per host/port). OIDC config is global to
  // the hub, so we only re-run if the targeted hub changes.
  useEffect(() => {
    let cancelled = false;
    setMode("loading");
    fetchHubConfig({ host: config.host, port: config.port })
      .then(async (cfg) => {
        if (cancelled) return;
        setOidc(cfg);
        if (!cfg.enabled || !cfg.issuer || !cfg.clientId) {
          setMode("token");
          return;
        }
        const mgr = buildManager(cfg);
        mgrRef.current = mgr;
        // Fires on initial load AND after each successful auto-renewal — so the
        // freshest token is always in state (and getIdToken returns it).
        mgr.events.addUserLoaded((u) => setUser(u));
        mgr.events.addUserUnloaded(() => setUser(null));
        // Only reached if renewal failed/unavailable: drop the session so the
        // Gate falls back to the sign-in screen.
        mgr.events.addAccessTokenExpired(() => void mgr.removeUser());

        try {
          if (isRedirectCallback()) {
            const u = await mgr.signinRedirectCallback();
            stripQuery();
            setUser(u);
          } else {
            setUser(await mgr.getUser());
          }
        } catch (e) {
          setError((e as Error).message);
          stripQuery();
        }
        if (!cancelled) setMode("oidc");
      })
      .catch(() => {
        // Hub unreachable: fall back to token onboarding (which surfaces the
        // connection error in its own UI).
        if (!cancelled) setMode("token");
      });
    return () => {
      cancelled = true;
    };
  }, [config.host, config.port]);

  const signIn = useCallback(() => {
    setError(null);
    mgrRef.current?.signinRedirect().catch((e) => setError((e as Error).message));
  }, []);

  const signOut = useCallback(() => {
    const mgr = mgrRef.current;
    if (!mgr) return;
    // Clear local session; a full IdP logout (end_session) is optional and
    // provider-dependent, so we just drop our token.
    void mgr.removeUser().then(() => setUser(null));
  }, []);

  const getIdToken = useCallback(async () => {
    const mgr = mgrRef.current;
    if (!mgr) return null;
    let u = await mgr.getUser();
    // Renew on demand if expired (e.g. a bridge reconnect or admin call right at
    // the expiry boundary) — keeps actions working without forcing a re-login.
    if (u && u.expired) {
      try {
        u = await mgr.signinSilent();
      } catch {
        u = null;
      }
    }
    return u && !u.expired ? (u.id_token ?? null) : null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ mode, oidc, user, signIn, signOut, getIdToken, error }),
    [mode, oidc, user, signIn, signOut, getIdToken, error],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
