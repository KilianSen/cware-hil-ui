import { useCallback, useEffect, useState } from "react";
import { Ban, Loader2, RefreshCw, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { useHub } from "../hooks/useHub";
import { useNow } from "../hooks/useNow";
import { listDevices, removeDevice, setDeviceDisabled, type PairDevice } from "../lib/pairing";
import { relativeTime } from "../lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Lists every issued token (paired humans and agents) by its short id, so you
 * can disable (reversible) or remove (permanent) one. Metadata only — the hub
 * never sends the secret token here.
 */
export function DeviceList() {
  const { config } = useConnection();
  const { connected } = useHub();
  const [devices, setDevices] = useState<PairDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Re-render periodically so the relative timestamps stay fresh.
  useNow(30_000);

  const refresh = useCallback(() => {
    listDevices(config)
      .then((d) => {
        setDevices(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [config]);

  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try {
      await fn();
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!connected) {
    return (
      <p className="text-muted-foreground text-sm">Connect to a hub to manage paired devices.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Paired humans and agents. Disable is reversible; remove is permanent.
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={refresh} className="text-muted-foreground">
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
          <TriangleAlert className="size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {devices === null ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : devices.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tokens issued yet.</p>
      ) : (
        <ul className="divide-border divide-y rounded-xl border">
          {devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{d.label || "unlabeled"}</span>
                  <code className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
                    {d.id}
                  </code>
                  {d.disabled && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-500">
                      disabled
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  added {relativeTime(d.createdAt)}
                  {d.lastSeen ? ` · last seen ${relativeTime(d.lastSeen)}` : " · never seen"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy === d.id}
                  onClick={() => act(d.id, () => setDeviceDisabled(config, d.id, !d.disabled))}
                  className="text-muted-foreground"
                >
                  {d.disabled ? <Undo2 className="size-3.5" /> : <Ban className="size-3.5" />}
                  {d.disabled ? "Enable" : "Disable"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy === d.id}
                  onClick={() => act(d.id, () => removeDevice(config, d.id))}
                  className={cn("text-muted-foreground hover:text-destructive")}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
