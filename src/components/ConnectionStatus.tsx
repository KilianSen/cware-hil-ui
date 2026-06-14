import { motion } from "motion/react";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { cn } from "../lib/cn";

type State = "off" | "connecting" | "connected";

const STATUS: Record<State, { dot: string; text: string; Icon: typeof Wifi; tone: string }> = {
  off: { dot: "bg-zinc-500", text: "no token", Icon: WifiOff, tone: "text-zinc-400" },
  connecting: { dot: "bg-amber-500", text: "connecting…", Icon: Loader2, tone: "text-amber-300" },
  connected: { dot: "bg-emerald-500", text: "connected", Icon: Wifi, tone: "text-emerald-300" },
};

/**
 * Compact live connection pill (animated dot + icon + label). Rendered in the
 * header on every page, and inside the Setup connection form. When `href` is set
 * the pill is a link — used in the header so clicking the status jumps to Setup.
 */
export function ConnectionStatus({ href, className }: { href?: string; className?: string }) {
  const { connected, enabled } = useHub();
  const state: State = !enabled ? "off" : connected ? "connected" : "connecting";
  const status = STATUS[state];

  const body = (
    <span className={cn("flex items-center gap-2 text-[13px]", status.tone, className)}>
      <span className="relative flex h-2.5 w-2.5">
        {state === "connecting" && (
          <motion.span
            className={cn("absolute inline-flex h-full w-full rounded-full", status.dot)}
            animate={{ scale: [1, 2], opacity: [0.6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", status.dot)} />
      </span>
      <status.Icon className={cn("h-3.5 w-3.5", state === "connecting" && "animate-spin")} />
      {status.text}
    </span>
  );

  if (!href) return body;
  return (
    <a
      href={href}
      title="Connection settings"
      className="rounded-md px-2 py-1 transition-colors hover:bg-zinc-800/60"
    >
      {body}
    </a>
  );
}
