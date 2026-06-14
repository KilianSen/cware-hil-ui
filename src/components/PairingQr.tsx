import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { buildPairingUrl } from "../lib/pairing";
import { CopyButton } from "./CopyButton";

/**
 * A scannable pairing code. Encodes the current host / port / token into a URL
 * that loads this same web UI already connected — point a phone's camera at it
 * to hand the dashboard off to another device on the LAN.
 */
export function PairingQr() {
  const { config } = useConnection();
  const url = useMemo(() => buildPairingUrl(config), [config]);
  const ready = config.token.trim().length > 0;

  if (!ready) {
    return (
      <div className="bg-card text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
        <QrCode className="size-4 shrink-0" />
        Set a token above to generate a pairing code.
      </div>
    );
  }

  return (
    <div className="bg-card flex flex-col items-center gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
      <div className="rounded-lg bg-white p-3">
        <QRCodeSVG value={url} size={148} level="M" marginSize={0} />
      </div>
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium">Scan to pair a device</p>
        <p className="text-muted-foreground text-sm">
          Opens this dashboard on another device on your network, already connected. The code carries
          the token — only share it with people you trust.
        </p>
        <CopyButton text={url} className="mt-1">
          Copy pairing link
        </CopyButton>
      </div>
    </div>
  );
}
