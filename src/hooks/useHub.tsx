import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Agent, Answer, HistoryFilter, Notification, Question } from "cware-hil-lib";
import { HubClient, type HubConnectionConfig, type HistoryResult, type Identity } from "../lib/hubClient";
import { useConnection } from "./useConnection";
import { useSettings } from "./useSettings";
import { useAuth } from "./useAuth";
import { osNotify, playBeep } from "../lib/alerts";

export interface HubState {
  connected: boolean;
  /** True once a token is set and we are attempting to connect. */
  enabled: boolean;
  /** The authenticated principal for this connection (null until connected). */
  you: Identity | null;
  /** Whether this principal may perform admin-gated actions (always true in single-user mode). */
  isAdmin: boolean;
  questions: Question[];
  agents: Agent[];
  /** Ephemeral toast queue (live notifications since page load). */
  notifications: Notification[];
  /** Persistent notification history (seeded from the snapshot). */
  notificationHistory: Notification[];
  /** Running hub version (null until connected / if the hub is older). */
  serverVersion: string | null;
  /** Bridge protocol version the hub speaks (null until connected). */
  serverProtocolVersion: number | null;
  submitAnswer: (answer: Answer) => void;
  cancelQuestion: (questionId: string) => void;
  dismissNotification: (id: string) => void;
  /** Clear the persistent notification history mirror (and any live toasts queue). */
  clearNotifications: () => void;
  /** Remove a single notification from the history mirror. */
  removeNotification: (id: string) => void;
  sendToAgent: (agentId: string, text: string) => void;
  removeAgent: (agentId: string) => void;
  requestHistory: (filter: HistoryFilter) => Promise<HistoryResult>;
}

const HubContext = createContext<HubState | null>(null);

function useHubClient(config: HubConnectionConfig): HubState {
  const clientRef = useRef<HubClient | null>(null);
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { settings } = useSettings();
  const { mode, user, getIdToken } = useAuth();
  const oidc = mode === "oidc";
  // Keep the latest settings readable from client callbacks without re-binding them.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  if (!clientRef.current) {
    const client = new HubClient(config);
    client.onChange = () => bump();
    client.onConnectionChange = (c) => setConnected(c);
    client.onNotify = (n) => {
      setNotifications((prev) => [...prev, n].slice(-50));
      if (settingsRef.current.osNotifications) osNotify("cc-hitl", n.message);
    };
    client.onQuestionCreated = (q) => {
      if (settingsRef.current.soundOnQuestion) playBeep();
      if (settingsRef.current.osNotifications) osNotify("New question", q.title);
    };
    clientRef.current = client;
  }

  // In OIDC mode we connect once a user is signed in (auth via the ID token); in
  // single-user mode, once a token is configured.
  const enabled = oidc ? !!user : config.token.trim().length > 0;

  useEffect(() => {
    const client = clientRef.current!;
    client.authProvider = oidc ? { oidc: true, getIdToken } : null;
    if (enabled) {
      client.setConfig(config);
    } else {
      client.disconnect();
      setConnected(false);
    }
    return () => client.disconnect();
  }, [config.host, config.port, config.token, enabled, oidc, getIdToken]);

  const client = clientRef.current;

  // Optimistic resolution: when we answer/dismiss, the hub only removes the
  // question from the list once it echoes the status change back. To make the
  // queue feel instant (and prevent a double-submit), we hide the id locally the
  // moment we act. The set self-prunes — and self-heals on reconnect — because we
  // drop any id the hub still reports as pending.
  const resolvedRef = useRef<Set<string>>(new Set());
  const resolveOptimistically = (id: string) => {
    resolvedRef.current.add(id);
    bump();
  };

  // `bump()` increments `version` on every bridge change; recompute the snapshots
  // whenever it (or the connection state) changes.
  const questions = useMemo(() => {
    const resolved = resolvedRef.current;
    for (const id of resolved) {
      const q = client.questions.get(id);
      if (!q || q.status !== "pending") resolved.delete(id);
    }
    return [...client.questions.values()]
      .filter((q) => q.status === "pending" && !resolved.has(q.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [client, version, connected]);
  const agents = useMemo(
    () => [...client.agents.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    [client, version, connected],
  );
  // Newest-first persistent history mirror.
  const notificationHistory = useMemo(
    () => [...client.notifications].reverse(),
    [client, version, connected],
  );

  return {
    connected,
    enabled,
    you: connected ? client.you : null,
    // Single-user mode: everyone is admin (preserves existing behavior). OIDC:
    // gated by the server-reported principal.
    isAdmin: oidc ? (connected ? (client.you?.admin ?? false) : false) : true,
    questions,
    agents,
    notifications,
    notificationHistory,
    serverVersion: connected ? client.serverVersion : null,
    serverProtocolVersion: connected ? client.serverProtocolVersion : null,
    submitAnswer: (a) => {
      client.submitAnswer(a);
      resolveOptimistically(a.questionId);
    },
    cancelQuestion: (id) => {
      client.cancelQuestion(id);
      resolveOptimistically(id);
    },
    dismissNotification: (id) => setNotifications((prev) => prev.filter((n) => n.id !== id)),
    clearNotifications: () => {
      client.notifications.length = 0;
      setNotifications([]);
      bump();
    },
    removeNotification: (id) => {
      const i = client.notifications.findIndex((n) => n.id === id);
      if (i >= 0) client.notifications.splice(i, 1);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      bump();
    },
    sendToAgent: (agentId, text) => client.sendToAgent(agentId, text),
    removeAgent: (agentId) => client.removeAgent(agentId),
    requestHistory: (filter) => client.requestHistory(filter),
  };
}

export function HubProvider({ children }: { children: ReactNode }) {
  const { config } = useConnection();
  const hub = useHubClient(config);
  return <HubContext.Provider value={hub}>{children}</HubContext.Provider>;
}

export function useHub(): HubState {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used within a HubProvider");
  return ctx;
}
