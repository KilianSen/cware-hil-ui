import { useHub } from "../hooks/useHub";
import { UI_VERSION, fmtVersion } from "../lib/version";

/** Muted footer showing the UI, hub, and protocol versions. */
export function VersionFooter() {
  const { connected, serverVersion, serverProtocolVersion } = useHub();

  return (
    <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-faint">
      <Item label="ui" value={fmtVersion(UI_VERSION)} />
      <span className="text-edge-strong">·</span>
      <Item label="hub" value={connected ? fmtVersion(serverVersion) : "—"} />
      <span className="text-edge-strong">·</span>
      <Item label="protocol" value={connected && serverProtocolVersion != null ? `v${serverProtocolVersion}` : "—"} />
    </footer>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label} <span className="text-ink-dim">{value}</span>
    </span>
  );
}
