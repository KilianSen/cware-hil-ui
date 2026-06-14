import type { HubConnectionConfig } from "./hubClient";

/**
 * Device pairing over a URL: the connection config (host / port / token) is
 * encoded into a `?pair=` query param so another device can scan a QR code,
 * load this same web UI, and come up already connected. The token is sensitive —
 * a pairing URL grants hub access, so it's only meant for trusted LAN handoff.
 */

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
