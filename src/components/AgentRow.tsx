import { useState } from "react";
import type { Agent } from "cware-hil-lib";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { CheckCircle2, Circle, Clock, Loader2, MessageSquarePlus, Send, Trash2, XCircle } from "lucide-react";
import { relativeTime } from "../lib/format";
import { useHub } from "../hooks/useHub";
import { cn } from "../lib/cn";

const STATUS: Record<Agent["status"], { badge: string; Icon: typeof Circle; spin?: boolean }> = {
  idle: { badge: "bg-zinc-700 text-zinc-200", Icon: Circle },
  working: { badge: "bg-sky-500/20 text-sky-300", Icon: Loader2, spin: true },
  waiting: { badge: "bg-amber-500/20 text-amber-300", Icon: Clock },
  done: { badge: "bg-emerald-500/20 text-emerald-300", Icon: CheckCircle2 },
  error: { badge: "bg-red-500/20 text-red-300", Icon: XCircle },
};

export function AgentRow({ agent }: { agent: Agent }) {
  const { sendToAgent, removeAgent } = useHub();
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const reduce = useReducedMotion();

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
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-zinc-100">{agent.label ?? agent.agentId.slice(0, 8)}</span>
        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", s.badge)}>
          <s.Icon className={cn("h-3 w-3", s.spin && !reduce && "animate-spin")} />
          {agent.status}
        </span>
        <span className="ml-auto text-xs text-zinc-500">{relativeTime(agent.lastSeen)}</span>
      </div>
      {agent.currentTask && <div className="mt-1.5 text-sm text-zinc-400">{agent.currentTask}</div>}
      {pct !== null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <motion.div
              className="h-full rounded-full bg-violet-500"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            />
          </div>
          <span className="w-9 text-right text-[11px] tabular-nums text-zinc-400">
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
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500"
            />
            <div className="flex items-center justify-end gap-2 text-xs">
              <button type="button" onClick={() => setComposing(false)} className="text-zinc-400 hover:text-zinc-200">
                Cancel
              </button>
              <motion.button
                type="button"
                onClick={send}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-1 rounded border border-violet-500 bg-violet-500/15 px-2.5 py-1 text-zinc-100 hover:bg-violet-500/25"
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
            className="mt-2 flex gap-3 text-xs text-zinc-500"
          >
            <button type="button" onClick={() => setComposing(true)} className="inline-flex items-center gap-1 hover:text-zinc-200">
              <MessageSquarePlus className="h-3.5 w-3.5" /> Message
            </button>
            <button type="button" onClick={() => removeAgent(agent.agentId)} className="inline-flex items-center gap-1 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
