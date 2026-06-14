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
import { HubClient, type HubConnectionConfig, type HistoryResult } from "../lib/hubClient";
import { useConnection } from "./useConnection";
import { useSettings } from "./useSettings";
import { osNotify, playBeep } from "../lib/alerts";

export interface HubState {
  connected: boolean;
  /** True once a token is set and we are attempting to connect. */
  enabled: boolean;
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

  const enabled = config.token.trim().length > 0;

  useEffect(() => {
    const client = clientRef.current!;
    if (enabled) {
      client.setConfig(config);
    } else {
      client.disconnect();
      setConnected(false);
    }
    return () => client.disconnect();
  }, [config.host, config.port, config.token, enabled]);

  const client = clientRef.current;

  // `bump()` increments `version` on every bridge change; recompute the snapshots
  // whenever it (or the connection state) changes.
  const questions = useMemo(
    () =>
      [...client.questions.values()]
        .filter((q) => q.status === "pending")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [client, version, connected],
  );
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
    questions,
    agents,
    notifications,
    notificationHistory,
    serverVersion: connected ? client.serverVersion : null,
    serverProtocolVersion: connected ? client.serverProtocolVersion : null,
    submitAnswer: (a) => client.submitAnswer(a),
    cancelQuestion: (id) => client.cancelQuestion(id),
    dismissNotification: (id) => setNotifications((prev) => prev.filter((n) => n.id !== id)),
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
