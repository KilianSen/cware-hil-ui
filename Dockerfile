# syntax=docker/dockerfile:1

# ---- builder: build the static SPA ----
FROM node:26-slim AS builder
WORKDIR /app
# git is needed to fetch the cware-hil-lib git dependency during npm ci.
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
# npm canonicalizes the GitHub dep to git+ssh in the lockfile; force anonymous
# HTTPS so the public repo is fetchable without SSH keys in the build.
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
    && git config --global url."https://github.com/".insteadOf "git@github.com:"
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runner: serve the static bundle with nginx ----
FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
# Fail the build early if the nginx config is malformed.
RUN nginx -t
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
