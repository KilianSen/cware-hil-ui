/**
 * Minimal window-backed event bus for UI commands that cross component
 * boundaries (e.g. the command palette asking the Dashboard to focus its search
 * or move the question cursor). Keeps those components decoupled — no shared
 * context just to relay a one-shot action.
 */
export type UiEvent =
  | { type: "focus-search" }
  | { type: "question-next" }
  | { type: "question-prev" }
  | { type: "question-open" };

const NAME = "cware:ui";

export function emitUi(ev: UiEvent): void {
  window.dispatchEvent(new CustomEvent<UiEvent>(NAME, { detail: ev }));
}

export function onUi(handler: (ev: UiEvent) => void): () => void {
  const fn = (e: Event) => handler((e as CustomEvent<UiEvent>).detail);
  window.addEventListener(NAME, fn);
  return () => window.removeEventListener(NAME, fn);
}
