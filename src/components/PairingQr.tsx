import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, QrCode, RefreshCw, TriangleAlert } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { useHub } from "../hooks/useHub";
import { buildPairingUrl, issueDeviceToken } from "../lib/pairing";
import type { HubConnectionConfig } from "../lib/hubClient";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./CopyButton";

/**
 * A scannable pairing code. Mints a *fresh, individually-revocable* token for the
 * device being added (so it isn't sharing this client's token), then encodes
 * host / port / that token into a URL that loads this same web UI already
 * connected. Point a phone's camera at it to hand the dashboard off.
 */
export function PairingQr() {
  const { config } = useConnection();
  const { connected } = useHub();
  const [device, setDevice] = useState<HubConnectionConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mint = () => {
    setLoading(true);
    setError(null);
    issueDeviceToken(config, "QR pairing")
      .then(setDevice)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  // Mint once when this panel first has a live connection. Re-mint via the
  // button (each press issues a new device token).
  useEffect(() => {
    if (connected && !device && !loading && !error) mint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  if (!connected) {
    return (
      <div className="bg-card text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
        <QrCode className="size-4 shrink-0" />
        Connect to a hub first, then a pairing code appears here.
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card flex flex-col gap-3 rounded-xl border p-4 text-sm">
        <p className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
          <TriangleAlert className="size-4 shrink-0" />
          {error}
        </p>
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={mint}>
          <RefreshCw className="size-4" /> Try again
        </Button>
      </div>
    );
  }

  if (loading || !device) {
    return (
      <div className="bg-card text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        Minting a device token…
      </div>
    );
  }

  const url = buildPairingUrl(device);
  return (
    <div className="bg-card flex flex-col items-center gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
      <div className="rounded-lg bg-white p-3">
        <QRCodeSVG value={url} size={148} level="M" marginSize={0} />
      </div>
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium">Scan to pair a device</p>
        <p className="text-muted-foreground text-sm">
          Opens this dashboard on another device, already connected with its own token —
          you can revoke that device later without affecting anyone else.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <CopyButton text={url}>Copy pairing link</CopyButton>
          <Button type="button" variant="ghost" size="sm" onClick={mint}>
            <RefreshCw className="size-4" /> New code
          </Button>
        </div>
      </div>
    </div>
  );
}
