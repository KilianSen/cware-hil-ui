import { useState } from "react";
import type { Agent } from "cware-hil-lib";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { relativeTime } from "../lib/format";
import { useHub } from "../hooks/useHub";
import { useNow } from "../hooks/useNow";
import { StatusLed, type LedTone } from "./StatusLed";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

const STATUS: Record<Agent["status"], { tone: LedTone; pulse?: boolean; tw: string }> = {
  idle: { tone: "idle", tw: "text-muted-foreground" },
  working: { tone: "info", pulse: true, tw: "text-sky-500" },
  waiting: { tone: "warn", pulse: true, tw: "text-amber-500" },
  done: { tone: "ok", tw: "text-emerald-500" },
  error: { tone: "danger", tw: "text-destructive" },
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
      className="bg-card text-card-foreground group rounded-lg border p-3 shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <StatusLed tone={s.tone} pulse={s.pulse} />
        <span className="truncate font-medium">
          {agent.label ?? (
            <span className="text-muted-foreground font-mono">{agent.agentId.slice(0, 8)}</span>
          )}
        </span>
        <span className={cn("text-xs", s.tw)}>{agent.status}</span>
        <span className="text-muted-foreground ml-auto shrink-0 text-xs">
          {relativeTime(agent.lastSeen)}
        </span>
      </div>
      {agent.currentTask && <div className="text-muted-foreground mt-1.5 text-sm">{agent.currentTask}</div>}
      {pct !== null && (
        <div className="mt-2 flex items-center gap-2">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-muted-foreground w-9 text-right font-mono text-[11px] tabular-nums">
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
            <Textarea
              rows={2}
              value={text}
              autoFocus
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                if (e.key === "Escape") setComposing(false);
              }}
              placeholder="Message to this agent…"
            />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setComposing(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={send}>
                <Send className="size-3" /> Send
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="mt-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 px-2"
              onClick={() => setComposing(true)}
            >
              <MessageSquarePlus className="size-3.5" /> Message
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-7 px-2"
              onClick={() => removeAgent(agent.agentId)}
              aria-label={`Remove agent ${agent.label ?? agent.agentId.slice(0, 8)}`}
            >
              <Trash2 className="size-3.5" /> Remove
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
