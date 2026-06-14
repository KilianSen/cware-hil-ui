import { useConnection } from "../hooks/useConnection";
import { Tabs } from "../components/Tabs";
import { CodeBlock } from "../components/CodeBlock";
import { ConnectionSettings } from "../components/ConnectionSettings";

export function Setup() {
  const { config } = useConnection();
  const host = config.host || "127.0.0.1";
  const port = config.port || 22360;
  const token = config.token.trim() || "<your-token>";

  const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  const httpScheme = window.location.protocol === "https:" ? "https" : "http";
  // Same-origin deployment (the hub is reached through this UI's reverse proxy):
  // reuse the page's authority so default ports like 443/80 are omitted — a
  // TLS-fronted single-port deploy then advertises the working URL instead of a
  // bogus `:22360`. A different host (e.g. a hub on 127.0.0.1) keeps host:port.
  const authority = host === window.location.hostname ? window.location.host : `${host}:${port}`;
  const mcpUrl = `${httpScheme}://${authority}/mcp`;
  const bridgeUrl = `${wsScheme}://${authority}/bridge`;

  const claudeCmd =
    `claude mcp add --transport http --scope project hitl ${mcpUrl} \\\n` +
    `  --header "Authorization: Bearer ${token}"`;

  const mcpJson = JSON.stringify(
    { mcpServers: { hitl: { type: "http", url: mcpUrl, headers: { Authorization: `Bearer ${token}` }, timeout: 86400000 } } },
    null,
    2,
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Hub connection</h2>
        <p className="mb-3 text-sm text-ink-dim">
          Where this dashboard reaches the hub. In a bundled deployment the host and token are
          filled in for you — leave them as-is. Point at a different hub by editing the fields below.
        </p>
        <ConnectionSettings />
      </section>

      <section>
        <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Connect an agent</h2>
        <p className="mb-3 text-sm text-ink-dim">
          The hub speaks MCP over Streamable HTTP at <code className="rounded bg-well px-1.5 py-0.5 text-[12.5px]">{mcpUrl}</code>.
          Point any MCP client at it with the bearer token — Claude Code is just one option.
        </p>
        <Tabs
          tabs={[
            {
              id: "claude",
              label: "Claude Code",
              render: () => (
                <div className="space-y-2">
                  <p className="text-sm text-ink-dim">Run in your project — writes a project-scoped <code className="rounded bg-well px-1 text-xs">.mcp.json</code>:</p>
                  <CodeBlock code={claudeCmd} />
                </div>
              ),
            },
            {
              id: "json",
              label: "MCP config (Cursor, Windsurf, …)",
              render: () => (
                <div className="space-y-2">
                  <p className="text-sm text-ink-dim">
                    The standard <code className="rounded bg-well px-1 text-xs">mcpServers</code> shape — for{" "}
                    <code className="rounded bg-well px-1 text-xs">.mcp.json</code>,{" "}
                    <code className="rounded bg-well px-1 text-xs">.cursor/mcp.json</code>, Windsurf, etc.:
                  </p>
                  <CodeBlock code={mcpJson} />
                </div>
              ),
            },
            {
              id: "raw",
              label: "Raw endpoint",
              render: () => (
                <KV
                  rows={[
                    ["Transport", "Streamable HTTP"],
                    ["Endpoint", mcpUrl],
                    ["Auth header", `Authorization: Bearer ${token}`],
                  ]}
                />
              ),
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Connect a human UI</h2>
        <p className="mb-3 text-sm text-ink-dim">
          Humans answer over the bridge WebSocket at <code className="rounded bg-well px-1.5 py-0.5 text-[12.5px]">{bridgeUrl}</code>.
          This web dashboard is one client; the Obsidian plugin is another.
        </p>
        <Tabs
          tabs={[
            {
              id: "web",
              label: "This dashboard",
              render: () => (
                <p className="text-sm text-ink-dim">
                  Already set up — enter the host, port, and token in the bar above and open the{" "}
                  <a href="#/" className="text-accent hover:underline">Dashboard</a>.
                </p>
              ),
            },
            {
              id: "obsidian",
              label: "Obsidian plugin",
              render: () => (
                <KV
                  rows={[
                    ["Host", host],
                    ["Port", String(port)],
                    ["Token", token],
                  ]}
                />
              ),
            },
            {
              id: "raw",
              label: "Raw bridge",
              render: () => (
                <div className="space-y-2">
                  <p className="text-sm text-ink-dim">Connect a WebSocket client (token as a query param), then send a <code className="rounded bg-well px-1 text-xs">hello</code> frame:</p>
                  <CodeBlock code={`${bridgeUrl}?token=${encodeURIComponent(token)}`} />
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}

function KV({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 rounded-xl border border-edge bg-panel p-4">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="text-sm text-ink-faint">{k}</span>
          <span className="break-all font-mono text-[13px] text-ink">{v}</span>
        </div>
      ))}
    </div>
  );
}
