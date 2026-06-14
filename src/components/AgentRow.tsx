import { useState } from "react";
import type { Agent } from "cware-hil-lib";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { relativeTime } from "../lib/format";
import { useHub } from "../hooks/useHub";
import { useNow } from "../hooks/useNow";
import { StatusLed, type LedTone } from "./StatusLed";
import { cn } from "../lib/cn";

const STATUS: Record<Agent["status"], { tone: LedTone; pulse?: boolean; tw: string }> = {
  idle: { tone: "idle", tw: "text-ink-faint" },
  working: { tone: "info", pulse: true, tw: "text-info" },
  waiting: { tone: "warn", pulse: true, tw: "text-warn" },
  done: { tone: "ok", tw: "text-ok" },
  error: { tone: "danger", tw: "text-danger" },
};

export function AgentRow({ agent }: { agent: Agent }) {
  const { sendToAgent, removeAgent } = useHub();
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  useNow(); // keep "last seen" fresh

  const send = () => {
    const t = text.trim();
    if (!t) return;
    // Prefer the durable identity so a reconnecting agent still receives it.
    sendToAgent(agent.stableId ?? agent.agentId, t);
    setText("");
    setComposing(false);
  };

  const s = STATUS[agent.status];
  const pct = typeof agent.progress === "number" ? Math.round(agent.progress * 100) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className="rounded-lg border border-edge bg-panel p-3"
    >
      <div className="flex items-center gap-2">
        <StatusLed tone={s.tone} pulse={s.pulse} />
        <span className="truncate font-medium text-ink">
          {agent.label ?? <span className="font-mono text-ink-dim">{agent.agentId.slice(0, 8)}</span>}
        </span>
        <span className={cn("font-mono text-[10px] uppercase tracking-wider", s.tw)}>{agent.status}</span>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-faint">{relativeTime(agent.lastSeen)}</span>
      </div>
      {agent.currentTask && <div className="mt-1.5 text-sm text-ink-dim">{agent.currentTask}</div>}
      {pct !== null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-well">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            />
          </div>
          <span className="w-9 text-right font-mono text-[11px] tabular-nums text-ink-dim">
            <NumberFlow value={pct} suffix="%" />
          </span>
        </div>
      )}

      <AnimatePresence initial={false} mode="wait">
        {composing ? (
          <motion.div
            key="compose"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-2 space-y-1.5 overflow-hidden"
          >
            <textarea
              rows={2}
              value={text}
              autoFocus
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                if (e.key === "Escape") setComposing(false);
              }}
              placeholder="Message to this agent…"
              className="w-full rounded-md border border-edge bg-well px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-accent"
            />
            <div className="flex items-center justify-end gap-2 text-xs">
              <button type="button" onClick={() => setComposing(false)} className="text-ink-dim hover:text-ink">
                Cancel
              </button>
              <motion.button
                type="button"
                onClick={send}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-1 rounded border border-accent bg-accent/15 px-2.5 py-1 text-ink hover:bg-accent/25"
              >
                <Send className="h-3 w-3" /> Send
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="mt-2 flex gap-3 text-xs text-ink-faint"
          >
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="inline-flex items-center gap-1 hover:text-ink"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" /> Message
            </button>
            <button
              type="button"
              onClick={() => removeAgent(agent.agentId)}
              aria-label={`Remove agent ${agent.label ?? agent.agentId.slice(0, 8)}`}
              className="inline-flex items-center gap-1 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
