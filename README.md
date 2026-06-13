# cware-hil-ui

Standalone **web UI** for the cware human-in-the-loop stack (Vite + React + Tailwind).
A browser-based alternative to the Obsidian plugin that talks to the hub
([cware-hil-mcp](https://github.com/KilianSen/cware-hil-mcp)) over its bridge WebSocket.

Two views:

- **Dashboard** (`#/`) — pending questions (`ask_user` / `ask_choice` / `request_approval`)
  with inline answer controls, and a live agent dashboard. Connects to the hub over
  `ws(s)://<host>:<port>/bridge`.
- **Setup** (`#/setup`) — connection snippets for agents (Claude Code, generic MCP
  config, raw endpoint) and human UIs (this dashboard, Obsidian, raw bridge).

The hub host / port / token are entered in the top bar and stored in the browser
(`localStorage`). Shared domain types + the bridge protocol come from
[cware-hil-lib](https://github.com/KilianSen/cware-hil-lib) (a git dependency).

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

Then open http://localhost:8080 and enter your hub's host / port / token in the top
bar. Or run it by hand / pull the CI-built image:

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

Open http://localhost:22360 and paste `CC_HITL_TOKEN` — host/port default to this
origin, so the dashboard connects with **no other config**. Agents connect at
`http://localhost:22360/mcp`. Over https the bridge is same-origin `wss` (no
mixed-content problem).

> Both images must be **public** on GHCR (or add registry credentials in Portainer)
> for the pull to succeed.

It's a static SPA, so it can equally be dropped on any static host (Netlify,
GitHub Pages, an S3 bucket, …).

## Connecting

The UI is origin-independent: it connects to whatever hub you point it at (the
bridge WebSocket needs no CORS). If you serve this UI over **https**, the hub must
be reachable over **wss** (TLS) — a plain-`ws` hub will be blocked as mixed content.

## CI

Every push to `main` builds and pushes an image to GHCR, with a semver tag derived
from commit messages ([Conventional Commits](https://www.conventionalcommits.org/)).
See `.github/workflows/docker.yml`.
