import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, TriangleAlert } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { useHub } from "../hooks/useHub";
import { useNow } from "../hooks/useNow";
import { fetchPairCode, type PairCodeResponse } from "../lib/pairing";
import { cn } from "@/lib/utils";

/**
 * Shows the hub's current rotating 8-digit pairing code with a countdown, so you
 * can read it aloud to someone setting up a new device (they type it into the
 * onboarding screen). Re-fetches a step before it expires.
 */
export function PairingCode() {
  const { config } = useConnection();
  const { connected } = useHub();
  const [code, setCode] = useState<PairCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(1000);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchPairCode(config)
      .then((c) => {
        setCode(c);
        // Refresh shortly after this step ends so the displayed code stays valid.
        const ms = Math.max(1000, new Date(c.expiresAt).getTime() - Date.now() + 500);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(load, ms);
      })
      .catch((e: Error) => setError(e.message));
  }, [config]);

  useEffect(() => {
    if (connected) load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [connected, load]);

  if (!connected) {
    return (
      <div className="bg-card text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
        <KeyRound className="size-4 shrink-0" />
        Connect to a hub first, then a pairing code appears here.
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card flex items-center gap-2 rounded-xl border p-4 text-sm text-amber-600 dark:text-amber-500">
        <TriangleAlert className="size-4 shrink-0" />
        {error}
      </div>
    );
  }

  if (!code) {
    return (
      <div className="bg-card text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        Loading code…
      </div>
    );
  }

  const secsLeft = Math.max(0, Math.ceil((new Date(code.expiresAt).getTime() - now) / 1000));
  const grouped = `${code.code.slice(0, 4)} ${code.code.slice(4)}`;
  const fraction = Math.min(1, secsLeft / code.periodSec);

  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <p className="text-sm font-medium">Pairing code</p>
      <p className="text-muted-foreground text-sm">
        Type this on the new device’s onboarding screen. It rotates every {code.periodSec}s —
        it never carries the token directly.
      </p>
      <div className="flex items-center gap-4">
        <span className="font-mono text-3xl font-semibold tracking-[0.2em] tabular-nums">{grouped}</span>
        <span
          className={cn(
            "text-sm tabular-nums",
            secsLeft <= 10 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground",
          )}
          aria-live="off"
        >
          {secsLeft}s
        </span>
      </div>
      <div className="bg-muted h-1 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}
