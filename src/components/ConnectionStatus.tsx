import { useHub } from "../hooks/useHub";
import { StatusLed, type LedTone } from "./StatusLed";
import { cn } from "../lib/cn";

type State = "off" | "connecting" | "connected";

const STATUS: Record<State, { tone: LedTone; text: string; pulse: boolean; tw: string }> = {
  off: { tone: "idle", text: "no token", pulse: false, tw: "text-ink-faint" },
  connecting: { tone: "warn", text: "linking…", pulse: true, tw: "text-warn" },
  connected: { tone: "live", text: "live", pulse: true, tw: "text-accent" },
};

/**
 * Compact live connection pill — a status LED + a mono label. Rendered in the
 * header (as a link to Setup) and inside the Setup connection form.
 */
export function ConnectionStatus({ href, className }: { href?: string; className?: string }) {
  const { connected, enabled } = useHub();
  const state: State = !enabled ? "off" : connected ? "connected" : "connecting";
  const status = STATUS[state];

  const body = (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider",
        status.tw,
        className,
      )}
    >
      <StatusLed tone={status.tone} pulse={status.pulse} />
      {status.text}
    </span>
  );

  if (!href) return body;
  return (
    <a
      href={href}
      title="Connection settings"
      className="rounded-md border border-edge bg-well px-2.5 py-1.5 transition-colors hover:border-edge-strong"
    >
      {body}
    </a>
  );
}
