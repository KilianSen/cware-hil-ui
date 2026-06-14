/** This UI's version, injected at build time (CI sets VITE_APP_VERSION); "dev" otherwise. */
export const UI_VERSION: string = import.meta.env.VITE_APP_VERSION || "dev";

/** Format a raw version string for display: semver gets a leading "v". */
export function fmtVersion(v: string | null | undefined): string {
  if (!v) return "—";
  return /^\d/.test(v) ? `v${v}` : v;
}
