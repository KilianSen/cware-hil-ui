import type { ThemePref } from "../hooks/useSettings";

/** Resolve a theme preference to the concrete mode, honoring the OS for "system". */
export function resolveTheme(pref: ThemePref): "dark" | "light" {
  if (pref === "dark" || pref === "light") return pref;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Apply a resolved theme to the document: data-theme attribute + theme-color meta. */
export function applyTheme(pref: ThemePref): void {
  if (typeof document === "undefined") return;
  const mode = resolveTheme(pref);
  document.documentElement.dataset.theme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", mode === "dark" ? "#07070a" : "#e6e8ee");
}
