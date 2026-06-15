import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, QrCode, Settings2, TriangleAlert } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { redeemPairingCode } from "../lib/pairing";
import { BrandMark } from "../components/BrandMark";
import { VersionFooter } from "../components/VersionFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * First-run screen, shown until a connection is configured. The token never gets
 * typed by hand: you either redeem an 8-digit code the hub shows on an
 * already-connected device, scan its QR (which loads this app already
 * connected), or — behind Advanced — point at a hub with a JIT-minted token.
 */
export function Onboarding({ onBack }: { onBack?: () => void }) {
  const { setConfig } = useConnection();
  const [code, setCode] = useState("");
  const [host, setHost] = useState("");
  const [needHost, setNeedHost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);

  const digits = code.replace(/\D/g, "").slice(0, 8);
  const ready = digits.length === 8 && (!needHost || host.trim().length > 0);

  const redeem = async () => {
    setBusy(true);
    setError(null);
    try {
      const cfg = await redeemPairingCode(digits, needHost ? { host: host.trim() } : undefined);
      setConfig(cfg); // token set → the app connects and this screen unmounts
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      // A "couldn't reach a hub" error on the same-origin attempt means the UI
      // isn't co-served with a hub — reveal the host field for a split deploy.
      if (!needHost && /couldn.t reach/i.test(msg)) setNeedHost(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="bg-primary/10 text-primary ring-primary/25 mb-4 flex size-12 items-center justify-center rounded-2xl ring-1">
            <BrandMark className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Connect to your hub</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            On a device that’s already connected, open{" "}
            <span className="text-foreground">Setup → Add another human</span> for a code or QR.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) void redeem();
          }}
          className="bg-card space-y-4 rounded-2xl border p-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="ob-code" className="text-muted-foreground text-xs">
              Pairing code
            </Label>
            <Input
              id="ob-code"
              value={digits}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="8-digit code"
              className="text-center font-mono text-lg tracking-[0.3em] tabular-nums"
            />
          </div>

          {needHost && (
            <div className="space-y-1.5">
              <Label htmlFor="ob-host" className="text-muted-foreground text-xs">
                Hub host
              </Label>
              <Input
                id="ob-host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="hub.example.com"
                spellCheck={false}
                className="font-mono text-[13px]"
              />
              <p className="text-muted-foreground text-xs">
                This UI isn’t served by a hub, so tell it where the hub is.
              </p>
            </div>
          )}

          {error && (
            <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" disabled={!ready || busy} className="w-full">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {busy ? "Connecting…" : "Connect"}
          </Button>

          <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
            <QrCode className="size-3.5" />
            Got a QR instead? Scan it — it opens this app already connected.
          </p>
        </form>

        <div className="mt-4">
          {!advanced ? (
            <button
              type="button"
              onClick={() => setAdvanced(true)}
              className="text-muted-foreground hover:text-foreground mx-auto flex items-center gap-1.5 text-xs"
            >
              <Settings2 className="size-3.5" />
              Advanced — connect manually
            </button>
          ) : (
            <AdvancedConnect />
          )}
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground mx-auto mt-4 flex items-center gap-1.5 text-xs"
          >
            <ArrowLeft className="size-3.5" />
            Back to sign in
          </button>
        )}

        <VersionFooter />
      </div>
    </div>
  );
}

/**
 * Manual host / port / token fallback. The token here is meant to be JIT-minted
 * on the hub (`cc-hitl token --new`), not the master token copied by hand.
 */
function AdvancedConnect() {
  const { setConfig } = useConnection();
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("22360");
  const [token, setToken] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (token.trim()) setConfig({ host: host.trim(), port: Number(port) || 22360, token: token.trim() });
      }}
      className="bg-card mt-1 space-y-3 rounded-2xl border p-5"
    >
      <p className="text-muted-foreground text-xs">
        Mint a client token on the hub with <span className="text-foreground font-mono">cc-hitl token --new</span>,
        then paste it here.
      </p>
      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="adv-host" className="text-muted-foreground text-xs">
            Host
          </Label>
          <Input
            id="adv-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            spellCheck={false}
            className="font-mono text-[13px]"
          />
        </div>
        <div className="w-24 space-y-1.5">
          <Label htmlFor="adv-port" className="text-muted-foreground text-xs">
            Port
          </Label>
          <Input
            id="adv-port"
            value={port}
            onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            className="font-mono text-[13px]"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="adv-token" className="text-muted-foreground text-xs">
          Token
        </Label>
        <Input
          id="adv-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          placeholder="client token"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-[13px]"
        />
      </div>
      <Button type="submit" disabled={!token.trim()} className="w-full">
        Connect
      </Button>
    </form>
  );
}
