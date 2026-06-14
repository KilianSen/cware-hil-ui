import { useHub } from "../hooks/useHub";
import { UI_VERSION, fmtVersion } from "../lib/version";

/** Muted footer showing the UI, hub, and protocol versions. */
export function VersionFooter() {
  const { connected, serverVersion, serverProtocolVersion } = useHub();

  return (
    <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-zinc-600">
      <Item label="UI" value={fmtVersion(UI_VERSION)} />
      <span className="text-zinc-700">·</span>
      <Item label="hub" value={connected ? fmtVersion(serverVersion) : "—"} />
      <span className="text-zinc-700">·</span>
      <Item label="protocol" value={connected && serverProtocolVersion != null ? `v${serverProtocolVersion}` : "—"} />
    </footer>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label} <span className="font-mono text-zinc-500">{value}</span>
    </span>
  );
}
