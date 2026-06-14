import { useConnection } from "../hooks/useConnection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "../components/CodeBlock";
import { ConnectionSettings } from "../components/ConnectionSettings";
import { PairingQr } from "../components/PairingQr";

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
    {
      mcpServers: {
        hitl: {
          type: "http",
          url: mcpUrl,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 86400000,
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-base font-medium">
          Hub connection
        </h2>
        <p className="text-muted-foreground mb-3 text-sm">
          Where this dashboard reaches the hub. In a bundled deployment the host and token are filled
          in for you — leave them as-is. Point at a different hub by editing the fields below.
        </p>
        <ConnectionSettings />
      </section>

      <section>
        <h2 className="mb-1 text-base font-medium">
          Connect an agent
        </h2>
        <p className="text-muted-foreground mb-3 text-sm">
          The hub speaks MCP over Streamable HTTP at <Code>{mcpUrl}</Code>. Point any MCP client at it
          with the bearer token — Claude Code is just one option.
        </p>
        <Tabs defaultValue="claude">
          <TabsList>
            <TabsTrigger value="claude">Claude Code</TabsTrigger>
            <TabsTrigger value="json">MCP config (Cursor, Windsurf, …)</TabsTrigger>
            <TabsTrigger value="raw">Raw endpoint</TabsTrigger>
          </TabsList>
          <TabsContent value="claude" className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Run in your project — writes a project-scoped <Code>.mcp.json</Code>:
            </p>
            <CodeBlock code={claudeCmd} />
          </TabsContent>
          <TabsContent value="json" className="space-y-2">
            <p className="text-muted-foreground text-sm">
              The standard <Code>mcpServers</Code> shape — for <Code>.mcp.json</Code>,{" "}
              <Code>.cursor/mcp.json</Code>, Windsurf, etc.:
            </p>
            <CodeBlock code={mcpJson} />
          </TabsContent>
          <TabsContent value="raw">
            <KV
              rows={[
                ["Transport", "Streamable HTTP"],
                ["Endpoint", mcpUrl],
                ["Auth header", `Authorization: Bearer ${token}`],
              ]}
            />
          </TabsContent>
        </Tabs>
      </section>

      <section>
        <h2 className="mb-1 text-base font-medium">
          Connect a human UI
        </h2>
        <p className="text-muted-foreground mb-3 text-sm">
          Humans answer over the bridge WebSocket at <Code>{bridgeUrl}</Code>. This web dashboard is
          one client; the Obsidian plugin is another.
        </p>
        <Tabs defaultValue="web">
          <TabsList>
            <TabsTrigger value="web">This dashboard</TabsTrigger>
            <TabsTrigger value="obsidian">Obsidian plugin</TabsTrigger>
            <TabsTrigger value="raw">Raw bridge</TabsTrigger>
          </TabsList>
          <TabsContent value="web" className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Already set up — enter the host, port, and token in the bar above and open the{" "}
              <a href="#/" className="text-primary hover:underline">
                Dashboard
              </a>
              . Or scan to pair another device:
            </p>
            <PairingQr />
          </TabsContent>
          <TabsContent value="obsidian">
            <KV
              rows={[
                ["Host", host],
                ["Port", String(port)],
                ["Token", token],
              ]}
            />
          </TabsContent>
          <TabsContent value="raw" className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Connect a WebSocket client (token as a query param), then send a <Code>hello</Code>{" "}
              frame:
            </p>
            <CodeBlock code={`${bridgeUrl}?token=${encodeURIComponent(token)}`} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[12.5px]">{children}</code>;
}

function KV({ rows }: { rows: [string, string][] }) {
  return (
    <div className="bg-card grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 rounded-xl border p-4">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="text-muted-foreground text-sm">{k}</span>
          <span className="break-all font-mono text-[13px]">{v}</span>
        </div>
      ))}
    </div>
  );
}
