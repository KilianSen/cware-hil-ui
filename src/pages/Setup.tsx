import type { ReactNode } from "react";
import { Bell, QrCode, Server, SquareTerminal } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "../components/CodeBlock";
import { ConnectionSettings, AlertSettings } from "../components/ConnectionSettings";
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
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Setup</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect this dashboard to your hub, then wire up agents and teammates.
        </p>
      </div>

      <Step n={1} icon={Server} title="Connect to your hub" desc="Point this dashboard at a running hub.">
        <ConnectionSettings />
      </Step>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Step
          n={2}
          icon={SquareTerminal}
          title="Connect an agent"
          desc="Add the MCP endpoint to any client, with the bearer token."
        >
          <Tabs defaultValue="claude">
            <TabsList>
              <TabsTrigger value="claude">Claude Code</TabsTrigger>
              <TabsTrigger value="json">MCP JSON</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>
            <TabsContent value="claude" className="mt-3">
              <CodeBlock code={claudeCmd} />
            </TabsContent>
            <TabsContent value="json" className="mt-3">
              <CodeBlock code={mcpJson} />
            </TabsContent>
            <TabsContent value="raw" className="mt-3">
              <KV
                rows={[
                  ["Transport", "Streamable HTTP"],
                  ["Endpoint", mcpUrl],
                  ["Auth", `Bearer ${token}`],
                ]}
              />
            </TabsContent>
          </Tabs>
        </Step>

        <Step
          n={3}
          icon={QrCode}
          title="Add another human"
          desc="Hand the dashboard to a phone, or connect the Obsidian plugin."
        >
          <Tabs defaultValue="scan">
            <TabsList>
              <TabsTrigger value="scan">Scan to pair</TabsTrigger>
              <TabsTrigger value="obsidian">Obsidian</TabsTrigger>
              <TabsTrigger value="raw">Raw bridge</TabsTrigger>
            </TabsList>
            <TabsContent value="scan" className="mt-3">
              <PairingQr />
            </TabsContent>
            <TabsContent value="obsidian" className="mt-3">
              <KV
                rows={[
                  ["Host", host],
                  ["Port", String(port)],
                  ["Token", token],
                ]}
              />
            </TabsContent>
            <TabsContent value="raw" className="mt-3 space-y-2">
              <p className="text-muted-foreground text-sm">
                Open a WebSocket (token as a query param), then send a <Code>hello</Code> frame:
              </p>
              <CodeBlock code={`${bridgeUrl}?token=${encodeURIComponent(token)}`} />
            </TabsContent>
          </Tabs>
        </Step>
      </div>

      <Step n={4} icon={Bell} title="Alerts" desc="How this dashboard nudges you about new questions.">
        <AlertSettings />
      </Step>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  desc,
  children,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary ring-primary/20 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1">
            {n}
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="text-muted-foreground size-4" />
              {title}
            </CardTitle>
            <CardDescription>{desc}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[12px]">
      {children}
    </code>
  );
}

function KV({ rows }: { rows: [string, string][] }) {
  return (
    <div className="bg-muted/40 grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 rounded-lg border p-3.5">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="text-muted-foreground text-sm">{k}</span>
          <span className="break-all font-mono text-[13px]">{v}</span>
        </div>
      ))}
    </div>
  );
}
