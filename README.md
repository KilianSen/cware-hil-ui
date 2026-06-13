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

The image serves the static bundle with nginx:

```bash
docker build -t cware-hil-ui .
docker run -d -p 8080:80 cware-hil-ui
# open http://localhost:8080 and point it at your hub
```

Or pull the CI-built image:

```bash
docker pull ghcr.io/kiliansen/cware-hil-ui:latest
```

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
