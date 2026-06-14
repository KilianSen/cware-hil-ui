import { cn } from "../lib/cn";

/** Semantic status tones → text color (the `.led` dot reads `currentColor`). */
const TONE = {
  live: "text-accent",
  ok: "text-ok",
  warn: "text-warn",
  info: "text-info",
  danger: "text-danger",
  idle: "text-ink-faint",
} as const;

export type LedTone = keyof typeof TONE;

/**
 * A glowing status light. `pulse` adds an expanding halo for "live" states
 * (automatically quieted under prefers-reduced-motion via the global rule).
 */
export function StatusLed({
  tone = "idle",
  pulse = false,
  className,
}: {
  tone?: LedTone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex h-2 w-2 items-center justify-center", TONE[tone], className)}>
      {pulse && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
      )}
      <span className="led" />
    </span>
  );
}
