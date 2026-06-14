import { useHub } from "../hooks/useHub";
import { StatusLed, type LedTone } from "./StatusLed";
import { cn } from "@/lib/utils";

type State = "off" | "connecting" | "connected";

const STATUS: Record<State, { tone: LedTone; text: string; pulse: boolean; tw: string }> = {
  off: { tone: "idle", text: "no token", pulse: false, tw: "text-muted-foreground" },
  connecting: { tone: "warn", text: "linking…", pulse: true, tw: "text-amber-500" },
  connected: { tone: "live", text: "live", pulse: true, tw: "text-emerald-500" },
};

/**
 * Compact live connection pill — a status dot + a label. Rendered in the header
 * (as a link to Setup) and inside the Setup connection form.
 */
export function ConnectionStatus({ href, className }: { href?: string; className?: string }) {
  const { connected, enabled } = useHub();
  const state: State = !enabled ? "off" : connected ? "connected" : "connecting";
  const status = STATUS[state];

  const body = (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide",
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
      className="hover:bg-accent rounded-md px-2 py-1.5 transition-colors"
    >
      {body}
    </a>
  );
}
