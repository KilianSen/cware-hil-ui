import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { useHub } from "../hooks/useHub";
import { useSettings } from "../hooks/useSettings";
import { notificationPermission, requestNotificationPermission } from "../lib/alerts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "local" | "external";
const LOCAL_HOST = "127.0.0.1";
const LOCAL_PORT = "22360";
const isLoopback = (h: string) => h === LOCAL_HOST || h === "localhost" || h === "::1";

/**
 * Editable hub connection (host / port / token) plus alert preferences. Lives on
 * the Setup page — the control pages only show the compact connection pill. The
 * draft is local until submitted, so we don't reconnect on every keystroke of
 * the token. The submit control reflects the *actual* live connection, not just
 * whether the draft was saved.
 */
export function ConnectionSettings() {
  const { config, setConfig } = useConnection();
  const { connected, enabled } = useHub();

  const [mode, setMode] = useState<Mode>(() => (isLoopback(config.host) ? "local" : "external"));
  const [host, setHost] = useState(config.host);
  const [port, setPort] = useState(String(config.port));
  const [token, setToken] = useState(config.token);
  const [showToken, setShowToken] = useState(false);

  // Keep the draft (and derived mode) in sync if the stored config changes
  // elsewhere — e.g. a device pairing handoff.
  useEffect(() => {
    setHost(config.host);
    setPort(String(config.port));
    setToken(config.token);
    setMode(isLoopback(config.host) ? "local" : "external");
  }, [config.host, config.port, config.token]);

  // Switching to Local snaps host/port back to the loopback hub; External just
  // unlocks the fields for editing.
  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === "local") {
      setHost(LOCAL_HOST);
      setPort(LOCAL_PORT);
    }
  };

  const dirty = host !== config.host || port !== String(config.port) || token !== config.token;

  const apply = () =>
    setConfig({ host: host.trim(), port: Number(port) || 22360, token: token.trim() });

  // After applying a config, give the bridge a moment; if it's still not up,
  // surface an honest "can't reach the hub" hint instead of a forever spinner.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (dirty || connected || !enabled) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 4500);
    return () => clearTimeout(t);
  }, [dirty, connected, enabled]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="local">Local</TabsTrigger>
            <TabsTrigger value="external">External</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-muted-foreground text-xs">
          {mode === "local"
            ? "The hub runs on this machine."
            : "A hub on another machine or behind a proxy."}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) apply();
        }}
        className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-3"
      >
        {mode === "external" && (
          <>
            <Field label="Host" htmlFor="conn-host" className="w-36">
              <Input
                id="conn-host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="hub.example.com"
                spellCheck={false}
                className="font-mono text-[13px]"
              />
            </Field>
            <Field label="Port" htmlFor="conn-port" className="w-24">
              <Input
                id="conn-port"
                value={port}
                onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="font-mono text-[13px]"
              />
            </Field>
          </>
        )}
        <Field label="Token" htmlFor="conn-token" className="min-w-[200px] flex-1">
          <div className="relative">
            <Input
              id="conn-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type={showToken ? "text" : "password"}
              placeholder="bearer token"
              autoComplete="off"
              spellCheck={false}
              className="pr-9 font-mono text-[13px]"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? "Hide token" : "Show token"}
              className="text-muted-foreground hover:text-foreground absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1"
            >
              {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <ConnectButton dirty={dirty} connected={connected} enabled={enabled} />
      </form>

      {slow && (
        <p className="flex items-center gap-1.5 px-1 text-xs text-amber-600 dark:text-amber-500">
          <TriangleAlert className="size-3.5 shrink-0" />
          Can’t reach the hub. Double-check the host, port, and token — the token must match the
          running hub.
        </p>
      )}
    </div>
  );
}

/** Submit control that mirrors the real connection lifecycle, not just "saved". */
function ConnectButton({
  dirty,
  connected,
  enabled,
}: {
  dirty: boolean;
  connected: boolean;
  enabled: boolean;
}) {
  if (dirty) {
    return <Button type="submit">Connect</Button>;
  }
  if (connected) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className="text-emerald-600 disabled:opacity-100 dark:text-emerald-500"
      >
        <Check className="size-4" /> Connected
      </Button>
    );
  }
  if (enabled) {
    return (
      <Button type="button" variant="secondary" disabled className="disabled:opacity-100">
        <Loader2 className="size-4 animate-spin" /> Connecting…
      </Button>
    );
  }
  return (
    <Button type="submit" disabled>
      Connect
    </Button>
  );
}

export function AlertSettings() {
  const { settings, update } = useSettings();
  const [perm, setPerm] = useState(notificationPermission());

  const enableOs = async (next: boolean) => {
    if (next && perm !== "granted") {
      const p = await requestNotificationPermission();
      setPerm(p);
      update({ osNotifications: p === "granted" });
    } else {
      update({ osNotifications: next });
    }
  };

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-4 px-1 text-[13px]">
      <div className="flex items-center gap-2">
        <Checkbox
          id="alert-sound"
          checked={settings.soundOnQuestion}
          onCheckedChange={(c) => update({ soundOnQuestion: c === true })}
        />
        <Label htmlFor="alert-sound" className="cursor-pointer font-normal">
          Sound on new question
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="alert-os"
          checked={settings.osNotifications && perm === "granted"}
          onCheckedChange={(c) => void enableOs(c === true)}
        />
        <Label htmlFor="alert-os" className="cursor-pointer font-normal">
          Desktop notifications
        </Label>
      </div>
      {perm === "denied" && (
        <span className="text-muted-foreground text-xs">(blocked by the browser)</span>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={htmlFor} className="text-muted-foreground text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}
