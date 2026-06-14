import type { Question, QuestionStatus } from "cware-hil-lib";
import { motion } from "motion/react";
import { ListChecks, MessageSquare, ShieldCheck } from "lucide-react";
import { relativeTime } from "../lib/format";
import { useNow } from "../hooks/useNow";
import { StatusLed, type LedTone } from "./StatusLed";
import { cn } from "../lib/cn";

const KIND: Record<Question["kind"], { label: string; Icon: typeof MessageSquare }> = {
  ask_user: { label: "ask_user", Icon: MessageSquare },
  ask_choice: { label: "ask_choice", Icon: ListChecks },
  request_approval: { label: "request_approval", Icon: ShieldCheck },
};

const STATUS: Record<QuestionStatus, { tone: LedTone; tw: string }> = {
  pending: { tone: "warn", tw: "text-warn" },
  answered: { tone: "ok", tw: "text-ok" },
  cancelled: { tone: "idle", tw: "text-ink-faint" },
  expired: { tone: "danger", tw: "text-danger" },
};

/** Read-only view of a past question and the human's answer. */
export function HistoryCard({ question: q }: { question: Question }) {
  const kind = KIND[q.kind];
  const st = STATUS[q.status];
  useNow();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className="rounded-xl border border-edge bg-panel p-4"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded border border-edge bg-well px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-ink-dim">
          <kind.Icon className="h-3 w-3" />
          {kind.label}
        </span>
        <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide", st.tw)}>
          <StatusLed tone={st.tone} />
          {q.status}
        </span>
        {q.priority && q.priority !== "normal" && (
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">{q.priority}</span>
        )}
        <span className="ml-auto font-mono text-[11px] text-ink-faint">{relativeTime(q.createdAt)}</span>
      </div>
      <div className="mb-1 font-medium text-ink">{q.title}</div>
      {(q.prompt || q.approval?.body) && (
        <p className="whitespace-pre-wrap text-sm text-ink-dim">{q.prompt ?? q.approval?.body}</p>
      )}
      <div className="mt-2 border-t border-edge pt-2 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Answer</span>
        <div className="mt-0.5 text-ink">{answerSummary(q)}</div>
      </div>
    </motion.div>
  );
}

function answerSummary(q: Question): string {
  const a = q.answer;
  if (!a) return q.status === "pending" ? "— still waiting —" : "— no answer —";
  if (a.kind === "ask_user") return a.text || "(empty)";
  if (a.kind === "ask_choice") {
    const labels = (a.choiceIds ?? [])
      .map((id) => q.choices?.find((c) => c.id === id)?.label ?? id)
      .join(", ");
    return a.text ? `${labels || "(none)"} — note: ${a.text}` : labels || "(none)";
  }
  return a.comment ? `${a.decision} — ${a.comment}` : (a.decision ?? "—");
}
