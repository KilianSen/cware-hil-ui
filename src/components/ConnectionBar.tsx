import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { useHub } from "../hooks/useHub";
import { useSettings } from "../hooks/useSettings";
import { notificationPermission, requestNotificationPermission } from "../lib/alerts";
import { cn } from "../lib/cn";

/**
 * Editable hub connection (host / port / token) plus a live status pill. The
 * draft is local until "Connect" commits it, so we don't reconnect on every
 * keystroke of the token.
 */
export function ConnectionBar() {
  const { config, setConfig } = useConnection();
  const { connected, enabled } = useHub();

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

  const state: "off" | "connecting" | "connected" = !enabled
    ? "off"
    : connected
      ? "connected"
      : "connecting";
  const status = {
    off: { dot: "bg-zinc-500", text: "no token", Icon: WifiOff, tone: "text-zinc-400" },
    connecting: { dot: "bg-amber-500", text: "connecting…", Icon: Loader2, tone: "text-amber-300" },
    connected: { dot: "bg-emerald-500", text: "connected", Icon: Wifi, tone: "text-emerald-300" },
  }[state];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 backdrop-blur">
        <Field label="Host" className="w-36">
          <input value={host} onChange={(e) => setHost(e.target.value)} spellCheck={false} className={inputCls} />
        </Field>
        <Field label="Port" className="w-24">
          <input
            value={port}
            onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            className={inputCls}
          />
        </Field>
        <Field label="Token" className="min-w-[200px] flex-1">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type="password"
            placeholder="bearer token"
            autoComplete="off"
            spellCheck={false}
            className={inputCls}
          />
        </Field>
        <motion.button
          type="button"
          onClick={apply}
          disabled={!dirty}
          whileTap={dirty ? { scale: 0.96 } : undefined}
          className="rounded-md border border-violet-500 bg-violet-500/15 px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-violet-500/25 disabled:cursor-default disabled:opacity-40"
        >
          {dirty ? "Connect" : "Connected"}
        </motion.button>
        <div className={cn("flex items-center gap-2 pb-1.5 text-[13px]", status.tone)}>
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
        </div>
      </div>
      <AlertSettings />
    </div>
  );
}

function AlertSettings() {
  const { settings, update } = useSettings();
  const [perm, setPerm] = useState(notificationPermission());

  const enableOs = async () => {
    if (perm !== "granted") {
      const p = await requestNotificationPermission();
      setPerm(p);
      update({ osNotifications: p === "granted" });
    } else {
      update({ osNotifications: !settings.osNotifications });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 px-1 text-[13px] text-zinc-400">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={settings.soundOnQuestion}
          onChange={(e) => update({ soundOnQuestion: e.target.checked })}
          className="accent-violet-500"
        />
        Sound on new question
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={settings.osNotifications && perm === "granted"}
          onChange={enableOs}
          className="accent-violet-500"
        />
        Desktop notifications
      </label>
      {perm === "denied" && <span className="text-xs text-zinc-600">(blocked by the browser)</span>}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-[13px] text-zinc-100 outline-none transition-colors focus:border-violet-500";

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
