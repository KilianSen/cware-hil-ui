# cware-hil-ui

Standalone **web UI** for the cware human-in-the-loop stack (Vite + React + Tailwind).
A browser-based alternative to the Obsidian plugin that talks to the hub
([cware-hil-mcp](https://github.com/KilianSen/cware-hil-mcp)) over its bridge WebSocket.

Two views:

- **Dashboard** (`#/`) — pending questions (`ask_user` / `ask_choice` / `request_approval`)
  with inline answer controls, and a live agent dashboard. Connects to the hub over
  `ws(s)://<host>:<port>/bridge`.
- **Setup** (`#/setup`) — connection snippets for agents (Claude Code, generic MCP
  config, raw endpoint) and ways to add more humans (QR, pairing code, Obsidian, raw).

On first run — when there's no deployment-injected token and nothing stored — the UI
shows a one-time **onboarding** screen instead of the dashboard. From there you connect
without copying a bearer token by hand (see [Onboarding & pairing](#onboarding--pairing)).
The resolved connection is stored in the browser (`localStorage`). Shared domain types +
the bridge protocol come from [cware-hil-lib](https://github.com/KilianSen/cware-hil-lib)
(a git dependency).

## Develop

```bash
npm install
npm run dev          # vite dev server
npm run build        # tsc --noEmit + vite build -> dist/
npm run preview      # serve the built bundle
```

## Docker

The image serves the static bundle with nginx. Easiest is compose:

```bash
docker compose up -d --build      # builds and serves on http://localhost:8080
```

Then open http://localhost:8080 and onboard with a pairing code from your hub
(`cc-hitl code`), or use Advanced to point at the hub directly. Or run it by hand /
pull the CI-built image:

```bash
docker build -t cware-hil-ui . && docker run -d -p 8080:80 cware-hil-ui
docker pull ghcr.io/kiliansen/cware-hil-ui:latest
```

### Full stack (UI + hub) on one port — Portainer-ready

`docker-compose.full.yml` is **images-only** (no `build:`, no bind mounts), so it
drops straight into a Portainer stack. It pulls the prebuilt hub + UI images; the
UI image itself reverse-proxies the hub paths (`nginx.conf`), so everything is on a
**single port**: `/` → UI, `/mcp` · `/bridge` · `/health` → hub.

```bash
# Portainer: paste docker-compose.full.yml into a stack, add CC_HITL_TOKEN as a
# stack environment variable, deploy. Or locally:
CC_HITL_TOKEN=$(openssl rand -hex 24) docker compose -f docker-compose.full.yml up -d
```

The UI image injects `CC_HITL_TOKEN` as the default token, so opening
http://localhost:22360 connects with **no onboarding** — host/port default to this
origin. Agents connect at `http://localhost:22360/mcp`. Over https the bridge is
same-origin `wss` (no mixed-content problem).

> Both images must be **public** on GHCR (or add registry credentials in Portainer)
> for the pull to succeed.

It's a static SPA, so it can equally be dropped on any static host (Netlify,
GitHub Pages, an S3 bucket, …).

## Onboarding & pairing

A bearer token is painful to type, so it's never copied by hand. Each human client
gets its **own revocable token**, minted by the hub at pairing time (the hub's master
token stays for agents and the CLI). Three ways to connect:

- **Env default** — a deployment can inject a token (`window.__CC_HITL_TOKEN__`, written
  from `CC_HITL_TOKEN`; see the Docker section). The UI comes up connected, no onboarding.
- **QR** *(preferred for a second device)* — on an already-connected client, open
  **Setup → Add another human → Scan QR**. It mints a fresh per-device token and encodes
  it into a URL; scan it and the new device loads this app already connected.
- **Pairing code** — for devices that can't scan. The hub shows a rotating 8-digit code
  (**Setup → Add another human → Pairing code**, or `cc-hitl code` on the hub). Type it
  into the new device's onboarding screen; it redeems the code for its own token. The
  code is a TOTP over the hub's master token (RFC 6238) — it never carries the token, and
  redemption (`POST /pair`) is rate-limited.

The pairing code redeems against the **same origin** by default (the single-port deploy
where this UI is served by the hub). If the UI is hosted separately, onboarding asks for
the hub's host. Manual host/port/token entry lives behind **Advanced** on both the
onboarding screen and Setup — paste a JIT token from `cc-hitl token --new`.

Every issued token has a short **id**. Manage them from **Setup → Manage access** (the
list shows ids and metadata only — never the secret token) or on the hub with
`cc-hitl tokens`, then `cc-hitl disable <id>` (reversible), `cc-hitl enable <id>`, or
`cc-hitl revoke <id>` (permanent). A disabled or revoked token drops on its next
reconnect.

## Multi-user (OIDC)

By default the hub is single-user (the token/QR/OTP flow above). For a team, enable
**multi-user mode** so humans sign in with an **OpenID Connect** provider instead of
sharing a token:

This uses a **backend (BFF) flow**: the **hub** is a confidential OIDC client. It does the
Authorization Code exchange (with the client secret), holds the tokens server-side, and
hands the browser only an **httpOnly session cookie** — no tokens ever live in JS.

- **Login** is a full-page redirect to the hub's `/auth/login`; the hub round-trips the
  issuer and sets the session cookie, then `/auth/me` tells the SPA who's signed in.
  Answers are attributed to the signed-in user. The session lives in the hub's SQLite and
  slides on activity, so renewal is server-side (no client token refresh).
- **Access:** any authenticated user from the configured issuer can use the dashboard —
  so point it at a **private/dedicated** issuer. A configurable **group claim** grants
  **admin**; the master token is an admin break-glass.
- **Admin-gated:** configuring OIDC/settings, issuing & managing agent/device tokens,
  removing agents, and cancelling questions. Everyone signed in can answer questions and
  message agents.
- **Agents** still authenticate to `/mcp` with bearer tokens (mint per-agent tokens from
  **Setup → Connect an agent**, admin only).
- **Same-origin only:** the session cookie requires the dashboard and hub on one origin —
  use the single-port **full-stack image** (its nginx proxies `/auth`, `/config`, `/pair`).
  Split-origin deployments stay on single-user token/QR/OTP.

Register the dashboard's **`<origin>/auth/callback`** as a redirect URI in your provider,
and create a **confidential** client (with a secret). Configure two ways:

```bash
# 1) Environment (pins the config; the UI setup is then disabled)
CC_HITL_OIDC_ISSUER=https://idp.example.com/realms/main \
CC_HITL_OIDC_CLIENT_ID=cware-hil-ui \
CC_HITL_OIDC_CLIENT_SECRET=… \
CC_HITL_OIDC_ADMIN_GROUP_CLAIM=groups \
CC_HITL_OIDC_ADMIN_GROUP=hitl-admin \
  ./cc-hitl start    # optional: CC_HITL_OIDC_REDIRECT_URL to override the callback
```

Or **2) one-time in the UI**: as the master-token admin, open **Setup → Multi-user
(OIDC)**, enter issuer + client id + secret (+ optional admin group), and save. Reload,
and everyone signs in via SSO.

The hub's `GET /config` reports the mode; the SPA shows a sign-in screen or token
onboarding accordingly.

## Connecting

The UI is origin-independent: it connects to whatever hub you point it at (the
bridge WebSocket needs no CORS). If you serve this UI over **https**, the hub must
be reachable over **wss** (TLS) — a plain-`ws` hub will be blocked as mixed content.

## CI

Every push to `main` builds and pushes an image to GHCR, with a semver tag derived
from commit messages ([Conventional Commits](https://www.conventionalcommits.org/)).
See `.github/workflows/docker.yml`.
