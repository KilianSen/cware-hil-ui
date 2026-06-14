#!/bin/sh
# Generate the SPA's runtime config from the environment at container start, so
# the UI can auto-populate the token field. The nginx base image runs every
# executable *.sh in /docker-entrypoint.d/ before starting nginx.
#
# CC_HITL_TOKEN unset/empty -> empty token (no auto-populate, hand-paste as before).
#
# SECURITY: this serves the token from the UI origin at GET /runtime-config.js,
# so anyone who can load the page can read it. Only set CC_HITL_TOKEN on the UI
# container for trusted / TLS-fronted deployments.
set -eu

out=/usr/share/nginx/html/runtime-config.js

# Escape backslashes and double quotes so any token is a valid JS string literal.
esc=$(printf '%s' "${CC_HITL_TOKEN:-}" | sed 's/\\/\\\\/g; s/"/\\"/g')

printf 'window.__CC_HITL_TOKEN__ = "%s";\n' "$esc" > "$out"
