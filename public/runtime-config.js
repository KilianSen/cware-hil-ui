// Runtime configuration, served as a plain (non-module) script so it runs before
// the app bundle. In a Docker deployment this file is OVERWRITTEN at container
// start from the CC_HITL_TOKEN env var (see docker-entrypoint.d/30-runtime-config.sh),
// which lets the UI auto-populate the token field. Empty by default (dev / no env).
window.__CC_HITL_TOKEN__ = "";
