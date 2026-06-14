import { useEffect, useState } from "react";
import { useConnection } from "../hooks/useConnection";
import { useSettings } from "../hooks/useSettings";
import { ConnectionStatus } from "./ConnectionStatus";
import { notificationPermission, requestNotificationPermission } from "../lib/alerts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Editable hub connection (host / port / token) plus alert preferences. Lives on
 * the Setup page — the control pages only show the compact {@link ConnectionStatus}
 * pill. The draft is local until "Connect" commits it, so we don't reconnect on
 * every keystroke of the token.
 */
export function ConnectionSettings() {
  const { config, setConfig } = useConnection();

  const [host, setHost] = useState(config.host);
  const [port, setPort] = useState(String(config.port));
  const [token, setToken] = useState(config.token);

  // Keep the draft in sync if the stored config changes elsewhere.
  useEffect(() => {
    setHost(config.host);
    setPort(String(config.port));
    setToken(config.token);
  }, [config.host, config.port, config.token]);

  const dirty = host !== config.host || port !== String(config.port) || token !== config.token;

  const apply = () => setConfig({ host: host.trim(), port: Number(port) || 22360, token: token.trim() });

  return (
    <div className="space-y-3">
      <div className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-3">
        <Field label="Host" htmlFor="conn-host" className="w-36">
          <Input
            id="conn-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
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
        <Field label="Token" htmlFor="conn-token" className="min-w-[200px] flex-1">
          <Input
            id="conn-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type="password"
            placeholder="bearer token"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-[13px]"
          />
        </Field>
        <Button type="button" onClick={apply} disabled={!dirty}>
          {dirty ? "Connect" : "Connected"}
        </Button>
        <div className="pb-1.5">
          <ConnectionStatus />
        </div>
      </div>
      <AlertSettings />
    </div>
  );
}

function AlertSettings() {
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
