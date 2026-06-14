import type { Question, QuestionStatus } from "cware-hil-lib";
import { motion } from "motion/react";
import { Ban, CheckCircle2, Clock, ListChecks, MessageSquare, ShieldCheck, TimerOff } from "lucide-react";
import { relativeTime } from "../lib/format";
import { cn } from "../lib/cn";

const KIND: Record<Question["kind"], { label: string; Icon: typeof MessageSquare }> = {
  ask_user: { label: "ask user", Icon: MessageSquare },
  ask_choice: { label: "ask choice", Icon: ListChecks },
  request_approval: { label: "request approval", Icon: ShieldCheck },
};

const STATUS: Record<QuestionStatus, { badge: string; Icon: typeof Clock }> = {
  pending: { badge: "bg-amber-500/20 text-amber-300", Icon: Clock },
  answered: { badge: "bg-emerald-500/20 text-emerald-300", Icon: CheckCircle2 },
  cancelled: { badge: "bg-zinc-700 text-zinc-300", Icon: Ban },
  expired: { badge: "bg-red-500/20 text-red-300", Icon: TimerOff },
};

/** Read-only view of a past question and the human's answer. */
export function HistoryCard({ question: q }: { question: Question }) {
  const kind = KIND[q.kind];
  const st = STATUS[q.status];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-zinc-400">
          <kind.Icon className="h-3 w-3" />
          {kind.label}
        </span>
        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", st.badge)}>
          <st.Icon className="h-3 w-3" />
          {q.status}
        </span>
        {q.priority && q.priority !== "normal" && (
          <span className="text-[11px] uppercase tracking-wide text-violet-300">{q.priority}</span>
        )}
        <span className="ml-auto text-xs text-zinc-500">{relativeTime(q.createdAt)}</span>
      </div>
      <div className="mb-1 font-medium text-zinc-100">{q.title}</div>
      {(q.prompt || q.approval?.body) && (
        <p className="whitespace-pre-wrap text-sm text-zinc-400">{q.prompt ?? q.approval?.body}</p>
      )}
      <div className="mt-2 border-t border-zinc-800 pt-2 text-sm">
        <span className="text-xs uppercase tracking-wide text-zinc-500">Answer</span>
        <div className="mt-0.5 text-zinc-200">{answerSummary(q)}</div>
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
