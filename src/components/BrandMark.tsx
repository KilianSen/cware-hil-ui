/**
 * The cware mark: a targeting-reticle ring (the loop) with a center decision node
 * and crosshair ticks (oversight) — "human-in-the-loop control". Inherits color
 * from `currentColor`, so wrap it in `text-accent` to get the signature teal.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <path
        d="M12 1.75v3M12 19.25v3M1.75 12h3M19.25 12h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}
