import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Bell, ChevronDown, Check, Loader2, QrCode, RefreshCw, Server, ShieldCheck, SquareTerminal, TriangleAlert, Users } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { useHub } from "../hooks/useHub";
import { useAuth } from "../hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeBlock } from "../components/CodeBlock";
import { ConnectionSettings, AlertSettings } from "../components/ConnectionSettings";
import { PairingQr } from "../components/PairingQr";
import { PairingCode } from "../components/PairingCode";
import { DeviceList } from "../components/DeviceList";
import { hubHttpBase, issueDeviceToken } from "../lib/pairing";
import { setHubOIDC } from "../lib/config";
import { cn } from "@/lib/utils";

export function Setup() {
  const { config } = useConnection();
  const { isAdmin } = useHub();
  const { mode } = useAuth();
  const host = config.host || "127.0.0.1";
  const port = config.port || 22360;
  const token = config.token.trim() || "<your-token>";

  const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  // Same-origin deployment (the hub is reached through this UI's reverse proxy):
  // reuse the page's authority so default ports like 443/80 are omitted — a
  // TLS-fronted single-port deploy then advertises the working URL instead of a
  // bogus `:22360`. A different host (e.g. a hub on 127.0.0.1) keeps host:port.
  const authority = host === window.location.hostname ? window.location.host : `${host}:${port}`;
  const bridgeUrl = `${wsScheme}://${authority}/bridge`;
  const oidcMode = mode === "oidc";

  // Sequential step numbering that skips admin-only cards for regular users.
  let step = 0;
  const n = () => ++step;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Setup</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isAdmin
            ? "Connect this dashboard to your hub, then wire up agents and teammates."
            : "Your connection details and alert preferences."}
        </p>
      </div>

      <Step n={n()} icon={Server} title="Connection" desc="This dashboard is bound to one hub.">
        <ConnectionSection />
      </Step>

      {isAdmin && (
        <>
          <Step
            n={n()}
            icon={Users}
            title="Multi-user (OIDC)"
            desc="Require single sign-on for humans, with an admin group claim."
          >
            <MultiUserCard />
          </Step>

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Step
              n={n()}
              icon={SquareTerminal}
              title="Connect an agent"
              desc="Add the MCP endpoint to any client. Each agent gets its own revocable token."
            >
              <AgentConnect />
            </Step>

            <Step
              n={n()}
              icon={QrCode}
              title="Add another human"
              desc={
                oidcMode
                  ? "Teammates sign in with single sign-on."
                  : "Hand the dashboard to a phone, or connect another bridge client."
              }
            >
              {oidcMode ? (
                <p className="text-muted-foreground text-sm">
                  Multi-user mode is on — share this dashboard's URL and teammates sign in via your
                  identity provider. Grant admin by adding them to the configured group.
                </p>
              ) : (
                <Tabs defaultValue="scan">
                  <TabsList>
                    <TabsTrigger value="scan">Scan QR</TabsTrigger>
                    <TabsTrigger value="code">Pairing code</TabsTrigger>
                    <TabsTrigger value="raw">Raw bridge</TabsTrigger>
                  </TabsList>
                  <TabsContent value="scan" className="mt-3">
                    <PairingQr />
                  </TabsContent>
                  <TabsContent value="code" className="mt-3">
                    <PairingCode />
                  </TabsContent>
                  <TabsContent value="raw" className="mt-3 space-y-2">
                    <p className="text-muted-foreground text-sm">
                      Open a WebSocket (token as a query param), then send a <Code>hello</Code> frame:
                    </p>
                    <CodeBlock code={`${bridgeUrl}?token=${encodeURIComponent(token)}`} />
                  </TabsContent>
                </Tabs>
              )}
            </Step>
          </div>

          <Step
            n={n()}
            icon={ShieldCheck}
            title="Manage access"
            desc="Disable or remove any paired device or agent — each holds its own token."
          >
            <DeviceList />
          </Step>
        </>
      )}

      <Step n={n()} icon={Bell} title="Alerts" desc="How this dashboard nudges you about new questions.">
        <AlertSettings />
      </Step>
    </div>
  );
}

/**
 * The one-time multi-user setup (admin-gated server-side). Enabling requires the
 * issuer + client id + secret (the hub is a confidential client); an optional
 * group claim/value grants admin to matching users. The PUT authenticates with
 * the master token in single-user mode, or the admin's session cookie in OIDC
 * mode (sent via credentials:include).
 */
function MultiUserCard() {
  const { config } = useConnection();
  const { mode, oidc } = useAuth();
  const enabled = oidc?.enabled ?? false;
  const [issuer, setIssuer] = useState(oidc?.issuer ?? "");
  const [clientId, setClientId] = useState(oidc?.clientId ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [groupClaim, setGroupClaim] = useState("groups");
  const [groupValue, setGroupValue] = useState("");
  const [scopes, setScopes] = useState("openid profile email groups");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Single-user setup is master-token authed; OIDC reconfig uses the cookie.
  const token = mode === "oidc" ? "" : config.token;

  const apply = async (turnOn: boolean) => {
    setBusy(true);
    setMsg(null);
    try {
      await setHubOIDC(
        { host: config.host, port: config.port, token },
        turnOn
          ? {
              issuerUrl: issuer.trim(),
              clientId: clientId.trim(),
              clientSecret: clientSecret.trim(),
              adminGroupClaim: groupClaim.trim(),
              adminGroupValue: groupValue.trim(),
              scopes: scopes.trim(),
            }
          : { issuerUrl: "", clientId: "" },
      );
      setMsg({
        ok: true,
        text: turnOn
          ? "Saved. Reload the page and sign in via your provider."
          : "Multi-user mode disabled. Reload to return to token onboarding.",
      });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {enabled && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-500">
          <Check className="size-4" /> Enabled — issuer{" "}
          <code className="font-mono text-[13px]">{oidc?.issuer}</code>
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Any authenticated user from the issuer can use the dashboard — only safe with a private /
        dedicated provider. Users in the admin group can manage tokens, agents, and these settings.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && issuer.trim() && clientId.trim()) void apply(true);
        }}
        className="bg-card grid gap-3 rounded-xl border p-3 sm:grid-cols-2"
      >
        <Field label="Issuer URL" htmlFor="oidc-iss" className="sm:col-span-2">
          <Input id="oidc-iss" value={issuer} onChange={(e) => setIssuer(e.target.value)}
            placeholder="https://idp.example.com/realms/main" spellCheck={false} className="font-mono text-[13px]" />
        </Field>
        <Field label="Client ID" htmlFor="oidc-cid">
          <Input id="oidc-cid" value={clientId} onChange={(e) => setClientId(e.target.value)}
            placeholder="cware-hil-ui" spellCheck={false} className="font-mono text-[13px]" />
        </Field>
        <Field label="Client secret" htmlFor="oidc-sec">
          <Input id="oidc-sec" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)}
            type="password" placeholder={enabled ? "unchanged" : "client secret"}
            autoComplete="off" spellCheck={false} className="font-mono text-[13px]" />
        </Field>
        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
          <Field label="Admin claim" htmlFor="oidc-gc">
            <Input id="oidc-gc" value={groupClaim} onChange={(e) => setGroupClaim(e.target.value)}
              placeholder="groups" spellCheck={false} className="font-mono text-[13px]" />
          </Field>
          <Field label="Admin value" htmlFor="oidc-gv">
            <Input id="oidc-gv" value={groupValue} onChange={(e) => setGroupValue(e.target.value)}
              placeholder="admin" spellCheck={false} className="font-mono text-[13px]" />
          </Field>
        </div>
        <Field label="Scopes" htmlFor="oidc-scopes" className="sm:col-span-2">
          <Input id="oidc-scopes" value={scopes} onChange={(e) => setScopes(e.target.value)}
            placeholder="openid profile email groups" spellCheck={false} className="font-mono text-[13px]" />
        </Field>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy || !issuer.trim() || !clientId.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
            {enabled ? "Save" : "Enable multi-user"}
          </Button>
          {enabled && (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void apply(false)}>
              Disable
            </Button>
          )}
        </div>
      </form>
      {msg && (
        <p className={cn("flex items-start gap-1.5 text-xs", msg.ok ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600 dark:text-amber-500")}>
          {msg.ok ? <Check className="mt-0.5 size-3.5 shrink-0" /> : <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />}
          {msg.text}
        </p>
      )}
    </div>
  );
}

/**
 * MCP connection snippets for agent clients, each carrying a freshly JIT-minted,
 * individually-revocable token (not the master). Mints once on connect; "New
 * token" issues another. Covers the common MCP-capable tools.
 */
function AgentConnect() {
  const { config } = useConnection();
  const { connected } = useHub();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mint = () => {
    setLoading(true);
    setError(null);
    issueDeviceToken(config, "agent")
      .then((c) => setToken(c.token))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (connected && !token && !loading && !error) mint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  if (!connected) {
    return (
      <div className="bg-card text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
        <SquareTerminal className="size-4 shrink-0" />
        Connect to a hub first, then a per-agent token appears here.
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-card flex flex-col gap-3 rounded-xl border p-4 text-sm">
        <p className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
          <TriangleAlert className="size-4 shrink-0" />
          {error}
        </p>
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={mint}>
          <RefreshCw className="size-4" /> Try again
        </Button>
      </div>
    );
  }
  if (loading || !token) {
    return (
      <div className="bg-card text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        Minting an agent token…
      </div>
    );
  }

  const mcpUrl = `${hubHttpBase(config)}/mcp`;
  const auth = `Bearer ${token}`;

  const claudeCmd =
    `claude mcp add --transport http --scope project hitl ${mcpUrl} \\\n` +
    `  --header "Authorization: ${auth}"`;
  const mcpJson = JSON.stringify(
    { mcpServers: { hitl: { type: "http", url: mcpUrl, headers: { Authorization: auth }, timeout: 86400000 } } },
    null,
    2,
  );
  const cursorJson = JSON.stringify(
    { mcpServers: { hitl: { url: mcpUrl, headers: { Authorization: auth } } } },
    null,
    2,
  );
  const vscodeJson = JSON.stringify(
    { servers: { hitl: { type: "http", url: mcpUrl, headers: { Authorization: auth } } } },
    null,
    2,
  );

  return (
    <div className="space-y-3">
      <Tabs defaultValue="claude">
        <TabsList className="flex-wrap">
          <TabsTrigger value="claude">Claude Code</TabsTrigger>
          <TabsTrigger value="cursor">Cursor</TabsTrigger>
          <TabsTrigger value="vscode">VS Code</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>
        <TabsContent value="claude" className="mt-3">
          <CodeBlock code={claudeCmd} />
        </TabsContent>
        <TabsContent value="cursor" className="mt-3 space-y-2">
          <FileHint path="~/.cursor/mcp.json" />
          <CodeBlock code={cursorJson} />
        </TabsContent>
        <TabsContent value="vscode" className="mt-3 space-y-2">
          <FileHint path=".vscode/mcp.json" />
          <CodeBlock code={vscodeJson} />
        </TabsContent>
        <TabsContent value="json" className="mt-3 space-y-2">
          <FileHint path=".mcp.json — Claude Desktop, Windsurf, and other mcpServers clients" />
          <CodeBlock code={mcpJson} />
        </TabsContent>
        <TabsContent value="raw" className="mt-3">
          <KV
            rows={[
              ["Transport", "Streamable HTTP"],
              ["Endpoint", mcpUrl],
              ["Auth", auth],
            ]}
          />
        </TabsContent>
      </Tabs>
      <Button type="button" variant="ghost" size="sm" onClick={mint}>
        <RefreshCw className="size-4" /> New token
      </Button>
    </div>
  );
}

function FileHint({ path }: { path: string }) {
  return (
    <p className="text-muted-foreground text-xs">
      Add to <Code>{path}</Code>
    </p>
  );
}

/**
 * Connection status with the host/port/token editor tucked behind "Advanced" —
 * first-run onboarding and QR/OTP are the normal paths; this is the escape hatch
 * for switching hubs or pasting a JIT-minted token.
 */
function ConnectionSection() {
  const { config } = useConnection();
  const { connected, enabled } = useHub();
  const [open, setOpen] = useState(false);

  const state = connected ? "Connected" : enabled ? "Connecting…" : "Not connected";
  const dot = connected ? "bg-emerald-500" : enabled ? "bg-amber-500" : "bg-muted-foreground/40";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", dot)} />
          <span className="font-medium">{state}</span>
        </span>
        <span className="text-muted-foreground font-mono text-[13px]">
          {config.host}
          {config.host === window.location.hostname ? "" : `:${config.port}`}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        Advanced — change hub or token
      </button>

      {open && <ConnectionSettings />}
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

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
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
