import type { Question, QuestionStatus } from "cware-hil-lib";
import { motion } from "motion/react";
import { ListChecks, MessageSquare, ShieldCheck } from "lucide-react";
import { relativeTime } from "../lib/format";
import { useNow } from "../hooks/useNow";
import { StatusLed, type LedTone } from "./StatusLed";
import { cn } from "@/lib/utils";

const KIND: Record<Question["kind"], { label: string; Icon: typeof MessageSquare }> = {
  ask_user: { label: "Question", Icon: MessageSquare },
  ask_choice: { label: "Choice", Icon: ListChecks },
  request_approval: { label: "Approval", Icon: ShieldCheck },
};

const STATUS: Record<QuestionStatus, { tone: LedTone; tw: string }> = {
  pending: { tone: "warn", tw: "text-amber-500" },
  answered: { tone: "ok", tw: "text-emerald-500" },
  cancelled: { tone: "idle", tw: "text-muted-foreground" },
  expired: { tone: "danger", tw: "text-destructive" },
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
      className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium leading-snug">{q.title}</div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <kind.Icon className="size-3.5" />
            <span>{kind.label}</span>
            <span className="text-border">·</span>
            <span>{relativeTime(q.createdAt)}</span>
          </div>
        </div>
        <span className={cn("flex shrink-0 items-center gap-1.5 text-xs", st.tw)}>
          <StatusLed tone={st.tone} />
          {q.status}
        </span>
      </div>
      {(q.prompt || q.approval?.body) && (
        <p className="text-muted-foreground whitespace-pre-wrap text-sm">
          {q.prompt ?? q.approval?.body}
        </p>
      )}
      <div className="mt-3 border-t pt-3 text-sm">
        <span className="text-muted-foreground text-xs">Answer</span>
        <div className="mt-0.5">{answerSummary(q)}</div>
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
