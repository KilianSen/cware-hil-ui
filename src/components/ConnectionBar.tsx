import { useEffect, useState } from "react";
import { useConnection } from "../hooks/useConnection";
import { useHub } from "../hooks/useHub";

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

  const status = !enabled
    ? { dot: "bg-zinc-500", text: "no token" }
    : connected
      ? { dot: "bg-emerald-500", text: "connected" }
      : { dot: "bg-red-500", text: "connecting…" };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <Field label="Host" className="w-36">
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          spellCheck={false}
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-[13px] text-zinc-100 outline-none focus:border-violet-500"
        />
      </Field>
      <Field label="Port" className="w-24">
        <input
          value={port}
          onChange={(e) => setPort(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-[13px] text-zinc-100 outline-none focus:border-violet-500"
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
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-[13px] text-zinc-100 outline-none focus:border-violet-500"
        />
      </Field>
      <button
        type="button"
        onClick={apply}
        disabled={!dirty}
        className="rounded-md border border-violet-500 bg-violet-500/15 px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-violet-500/25 disabled:cursor-default disabled:opacity-40"
      >
        {dirty ? "Connect" : "Connected"}
      </button>
      <div className="flex items-center gap-2 pb-1.5 text-[13px] text-zinc-400">
        <span className={"h-2.5 w-2.5 rounded-full " + status.dot} />
        {status.text}
      </div>
    </div>
  );
}

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
    <label className={"block " + className}>
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
