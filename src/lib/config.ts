import { hubHttpBase } from "./pairing";

/** Public OIDC config from the hub's `GET /config` (mirrors lib OIDCPublicConfig). */
export interface OIDCPublicConfig {
  enabled: boolean;
  issuer?: string;
  clientId?: string;
}

/**
 * Fetch the hub's public config (which auth mode it's in). Used on load to decide
 * between an OIDC sign-in and the single-user token onboarding.
 */
export async function fetchHubConfig(config: { host: string; port: number }): Promise<OIDCPublicConfig> {
  const resp = await fetch(`${hubHttpBase(config)}/config`);
  if (!resp.ok) throw new Error(`Could not read hub config (${resp.status}).`);
  return (await resp.json()) as OIDCPublicConfig;
}

/** Set the hub's OIDC config (admin-gated PUT /config). Disable with enabled:false. */
export async function setHubOIDC(
  config: { host: string; port: number; token: string },
  body: { issuerUrl: string; clientId: string; adminGroupClaim?: string; adminGroupValue?: string },
): Promise<void> {
  const resp = await fetch(`${hubHttpBase(config)}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.token}` },
    body: JSON.stringify(body),
  });
  if (resp.status === 401 || resp.status === 403) throw new Error("Admin access required to change auth settings.");
  if (resp.status === 409) throw new Error("OIDC is pinned by environment variables and can't be changed here.");
  if (!resp.ok) {
    const data = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Could not save (${resp.status}).`);
  }
}
