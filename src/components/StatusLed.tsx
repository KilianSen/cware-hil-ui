import { cn } from "@/lib/utils";

/** Semantic status tones → dot color. */
const TONE = {
  live: "bg-emerald-500",
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  info: "bg-sky-500",
  danger: "bg-destructive",
  idle: "bg-muted-foreground",
} as const;

export type LedTone = keyof typeof TONE;

/**
 * A small status dot. `pulse` adds an expanding halo for "live" states
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
    <span className={cn("relative inline-flex size-2 items-center justify-center", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            TONE[tone],
          )}
        />
      )}
      <span className={cn("inline-block size-2 rounded-full", TONE[tone], tone !== "idle" && "signal")} />
    </span>
  );
}
