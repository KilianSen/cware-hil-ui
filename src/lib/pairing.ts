import type { HubConnectionConfig } from "./hubClient";

/**
 * Device pairing. Two ways to bring a new human client onto a hub without anyone
 * typing a 48-char bearer token by hand:
 *
 *   - QR — an already-connected client mints a fresh per-device token
 *     (`POST /pair/issue`) and encodes host/port/token into a `?pair=` URL the new
 *     device scans, loading this same web UI already connected.
 *   - OTP — the hub shows a rotating 8-digit code (`GET /pair/code`); the new
 *     device types it into `POST /pair` and gets back its own token.
 *
 * Each paired device gets an individually-revocable token, distinct from the
 * hub's master token. The wire shapes below mirror cware-hil-lib/src/pairing.ts
 * (the source of truth — defined locally here the same way HubConnectionConfig
 * is, so the UI builds without waiting on a lib republish).
 */

interface PairIssueResponse {
  host: string;
  port: number;
  token: string;
  label?: string;
}

export interface PairCodeResponse {
  code: string;
  periodSec: number;
  expiresAt: string;
}

/** A paired client/agent for management — metadata only, no secret token. */
export interface PairDevice {
  id: string;
  label?: string;
  createdAt: string;
  lastSeen?: string;
  disabled: boolean;
}

// ---------------------------------------------------------------------------
// QR pairing URL (?pair=) — unchanged wire format, now carrying an issued token
// ---------------------------------------------------------------------------

interface PairingPayload {
  h: string;
  p: number;
  t: string;
}

const PARAM = "pair";

/** base64url(JSON) — URL-safe, no padding. */
function encode(payload: PairingPayload): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(value: string): PairingPayload | null {
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const v = JSON.parse(json) as Partial<PairingPayload>;
    if (typeof v.h !== "string" || typeof v.t !== "string") return null;
    return { h: v.h, p: typeof v.p === "number" ? v.p : 22360, t: v.t };
  } catch {
    return null;
  }
}

/** Build the absolute pairing URL for the given config (loads this same app). */
export function buildPairingUrl(config: HubConnectionConfig): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  const pair = encode({ h: config.host, p: config.port, t: config.token });
  // Keep the hash route so the scanning device lands on the dashboard.
  return `${base}?${PARAM}=${pair}#/`;
}

/** Read a pairing payload from the current URL's query string, if present. */
export function readPairingFromUrl(): HubConnectionConfig | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get(PARAM);
  if (!raw) return null;
  const p = decode(raw);
  return p ? { host: p.h, port: p.p, token: p.t } : null;
}

/** Strip the `?pair=` param from the address bar without a navigation. */
export function stripPairingFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

// ---------------------------------------------------------------------------
// Hub HTTP helpers
// ---------------------------------------------------------------------------

const httpScheme = () => (window.location.protocol === "https:" ? "https" : "http");

/**
 * The hub's HTTP(S) base URL for a connection config. When the configured host
 * is the page's host (the single-port reverse-proxy deploy), reuse the page's
 * authority so default ports are omitted — mirrors the bridge URL logic in
 * hubClient.ts.
 */
export function hubHttpBase(config: { host: string; port: number }): string {
  const authority =
    config.host === window.location.hostname ? window.location.host : `${config.host}:${config.port}`;
  return `${httpScheme()}://${authority}`;
}

/**
 * Mint a fresh per-device token for QR hand-off, authenticated by the current
 * connection. Keeps the working host/port (this client is already connected with
 * them) and only swaps in the newly issued, individually-revocable token.
 */
export async function issueDeviceToken(
  config: HubConnectionConfig,
  label?: string,
): Promise<HubConnectionConfig> {
  const url = `${hubHttpBase(config)}/pair/issue${label ? `?label=${encodeURIComponent(label)}` : ""}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!resp.ok) throw new Error(`Could not issue a device token (${resp.status}).`);
  const data = (await resp.json()) as PairIssueResponse;
  return { host: config.host, port: config.port, token: data.token };
}

/** Fetch the hub's current rotating pairing code (authenticated). */
export async function fetchPairCode(config: HubConnectionConfig): Promise<PairCodeResponse> {
  const resp = await fetch(`${hubHttpBase(config)}/pair/code`, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!resp.ok) throw new Error(`Could not fetch the pairing code (${resp.status}).`);
  return (await resp.json()) as PairCodeResponse;
}

/** List paired clients/agents for management (metadata only — no tokens). */
export async function listDevices(config: HubConnectionConfig): Promise<PairDevice[]> {
  const resp = await fetch(`${hubHttpBase(config)}/pair/devices`, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!resp.ok) throw new Error(`Could not list devices (${resp.status}).`);
  return (await resp.json()) as PairDevice[];
}

/** Disable or re-enable a device by its short id. */
export async function setDeviceDisabled(
  config: HubConnectionConfig,
  id: string,
  disabled: boolean,
): Promise<void> {
  const action = disabled ? "disable" : "enable";
  const resp = await fetch(`${hubHttpBase(config)}/pair/devices/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!resp.ok) throw new Error(`Could not ${action} device (${resp.status}).`);
}

/** Permanently remove (revoke) a device by its short id. */
export async function removeDevice(config: HubConnectionConfig, id: string): Promise<void> {
  const resp = await fetch(`${hubHttpBase(config)}/pair/devices/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!resp.ok) throw new Error(`Could not remove device (${resp.status}).`);
}

/**
 * Redeem an 8-digit code for a connection config. Same-origin by default (the
 * hub is reached through this UI's reverse proxy); pass `host` for a split
 * deploy where the UI isn't co-served with a hub. The hub's self-reported bind
 * address is ignored — we connect via the page origin (same-origin) or the host
 * the human supplied.
 */
export async function redeemPairingCode(
  code: string,
  opts?: { host?: string; port?: number },
): Promise<HubConnectionConfig> {
  const sameOrigin = !opts?.host;
  const base = sameOrigin
    ? window.location.origin
    : `${httpScheme()}://${opts!.host}:${opts!.port ?? 22360}`;

  let resp: Response;
  try {
    resp = await fetch(`${base}/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
  } catch {
    throw new Error(
      sameOrigin
        ? "Couldn't reach a hub at this address. If the UI isn't served by the hub, enter the hub's host."
        : "Couldn't reach the hub at that host.",
    );
  }
  if (resp.status === 401) throw new Error("That code is invalid or has expired. Get a fresh one.");
  if (resp.status === 429) throw new Error("Too many attempts — wait a moment and try again.");
  if (!resp.ok) throw new Error(`Pairing failed (${resp.status}).`);

  const data = (await resp.json()) as PairIssueResponse;
  if (sameOrigin) {
    // Connect same-origin: store the page's host so hubClient reuses the origin
    // (its authority check is `host === window.location.hostname`).
    return {
      host: window.location.hostname,
      port: Number(window.location.port) || data.port,
      token: data.token,
    };
  }
  return { host: opts!.host!, port: opts!.port ?? data.port, token: data.token };
}
