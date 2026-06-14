import { useState } from "react";
import type { Answer, Question } from "cware-hil-lib";
import { motion } from "motion/react";
import { useHotkeys } from "react-hotkeys-hook";
import { ListChecks, MessageSquare, ShieldCheck, X } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { useNow } from "../hooks/useNow";
import { relativeTime } from "../lib/format";
import { cn } from "../lib/cn";

const KIND: Record<Question["kind"], { label: string; Icon: typeof MessageSquare }> = {
  ask_user: { label: "ask_user", Icon: MessageSquare },
  ask_choice: { label: "ask_choice", Icon: ListChecks },
  request_approval: { label: "request_approval", Icon: ShieldCheck },
};

export function QuestionCard({
  question,
  agentLabel,
  selected = false,
}: {
  question: Question;
  agentLabel?: string;
  selected?: boolean;
}) {
  const { submitAnswer, cancelQuestion, connected } = useHub();
  useNow(); // keep the "Xm ago" timestamp fresh
  const send = (a: Answer) => submitAnswer(a);
  const now = () => new Date().toISOString();
  const kind = KIND[question.kind];
  const high = question.priority === "high";

  return (
    <motion.div
      layout
      data-question-card
      data-selected={selected || undefined}
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      className={cn(
        "rounded-xl border bg-panel p-4 transition-shadow",
        high ? "border-l-2 border-l-prio-high border-edge" : "border-edge",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-canvas",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded border border-edge bg-well px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-ink-dim">
          <kind.Icon className="h-3 w-3" />
          {kind.label}
        </span>
        {question.priority && question.priority !== "normal" && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide",
              question.priority === "high" ? "bg-danger/20 text-danger" : "bg-well text-ink-faint",
            )}
          >
            {question.priority}
          </span>
        )}
        {agentLabel && <span className="truncate text-xs text-ink-faint">{agentLabel}</span>}
        <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-faint">
          {relativeTime(question.createdAt)}
        </span>
      </div>
      <div className="mb-2 font-medium text-ink">{question.title}</div>

      {question.kind === "ask_user" && (
        <AskUser
          prompt={question.prompt}
          disabled={!connected}
          onSubmit={(text) => send({ questionId: question.id, kind: "ask_user", text, answeredAt: now() })}
        />
      )}
      {question.kind === "ask_choice" && (
        <AskChoice
          question={question}
          disabled={!connected}
          onSubmit={(choiceIds, text) =>
            send({ questionId: question.id, kind: "ask_choice", choiceIds, text, answeredAt: now() })
          }
        />
      )}
      {question.kind === "request_approval" && (
        <Approval
          question={question}
          disabled={!connected}
          onDecide={(decision, comment) =>
            send({ questionId: question.id, kind: "request_approval", decision, comment, answeredAt: now() })
          }
        />
      )}

      <div className="mt-3 flex items-center justify-between">
        {!connected ? (
          <span className="font-mono text-[11px] uppercase tracking-wider text-warn">paused · reconnecting</span>
        ) : (
          <span />
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => cancelQuestion(question.id)}
          aria-label="Dismiss question"
          className="inline-flex items-center gap-1 rounded-md border border-edge px-3 py-1.5 text-sm text-ink-dim transition-colors hover:border-edge-strong hover:text-ink"
        >
          <X className="h-3.5 w-3.5" /> Dismiss
        </motion.button>
      </div>
    </motion.div>
  );
}

const textareaCls =
  "w-full rounded-lg border border-edge bg-well px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-50";
const primaryCls =
  "inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent/15 px-3 py-1.5 text-sm text-ink transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40";

/** ⌘/Ctrl+Enter to submit from a textarea. */
function submitChord(e: React.KeyboardEvent, run: () => void) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    run();
  }
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="ml-1">{children}</kbd>;
}

function AskUser({
  prompt,
  disabled,
  onSubmit,
}: {
  prompt?: string;
  disabled?: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      {prompt && <p className="whitespace-pre-wrap text-sm text-ink-dim">{prompt}</p>}
      <textarea
        rows={3}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => submitChord(e, () => onSubmit(text))}
        placeholder="Type your answer…"
        className={textareaCls}
      />
      <div className="flex justify-end">
        <motion.button
          type="button"
          disabled={disabled}
          whileTap={disabled ? undefined : { scale: 0.96 }}
          className={primaryCls}
          onClick={() => onSubmit(text)}
        >
          Submit<Kbd>⌘↵</Kbd>
        </motion.button>
      </div>
    </div>
  );
}

function AskChoice({
  question,
  disabled,
  onSubmit,
}: {
  question: Question;
  disabled?: boolean;
  onSubmit: (choiceIds: string[], note?: string) => void;
}) {
  const multi = question.multi ?? false;
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const toggle = (id: string) => {
    if (multi) setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    else setSelected([id]);
  };

  const submit = () => onSubmit(selected, note.trim() || undefined);

  return (
    <div className="space-y-2">
      {question.prompt && <p className="whitespace-pre-wrap text-sm text-ink-dim">{question.prompt}</p>}
      <div
        role={multi ? "group" : "radiogroup"}
        aria-label="Choices"
        className="space-y-1"
      >
        {(question.choices ?? []).map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-ink transition-colors hover:bg-well"
          >
            <input
              type={multi ? "checkbox" : "radio"}
              name={`q-${question.id}`}
              checked={selected.includes(c.id)}
              disabled={disabled}
              onChange={() => toggle(c.id)}
              className="accent-accent"
            />
            {c.label}
          </label>
        ))}
      </div>
      <textarea
        rows={2}
        value={note}
        disabled={disabled}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => submitChord(e, submit)}
        placeholder="Add a note (optional)…"
        className={textareaCls}
      />
      <div className="flex justify-end">
        <motion.button
          type="button"
          disabled={disabled}
          whileTap={disabled ? undefined : { scale: 0.96 }}
          className={primaryCls}
          onClick={submit}
        >
          Submit<Kbd>⌘↵</Kbd>
        </motion.button>
      </div>
    </div>
  );
}

function Approval({
  question,
  disabled,
  onDecide,
}: {
  question: Question;
  disabled?: boolean;
  onDecide: (decision: "approve" | "reject", comment?: string) => void;
}) {
  const [comment, setComment] = useState("");
  const a = question.approval;
  const commentOpt = () => comment.trim() || undefined;

  // `a`/`r` while the card is focused (not while typing in the comment field).
  const hotRef = useHotkeys<HTMLDivElement>(
    "a, r",
    (_e, h) => {
      if (disabled) return;
      if (h.keys?.includes("r")) onDecide("reject", commentOpt());
      else onDecide("approve", commentOpt());
    },
    { preventDefault: true },
  );

  return (
    <div ref={hotRef} tabIndex={-1} className="space-y-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
      {a?.body && <p className="whitespace-pre-wrap text-sm text-ink-dim">{a.body}</p>}
      {a?.diff && (
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-edge bg-well p-3 font-mono text-[12px] text-ink-dim">
          {a.diff}
        </pre>
      )}
      <input
        type="text"
        value={comment}
        disabled={disabled}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (optional)…"
        className={textareaCls}
      />
      <div className="flex justify-end gap-2">
        <motion.button
          type="button"
          disabled={disabled}
          whileTap={disabled ? undefined : { scale: 0.96 }}
          onClick={() => onDecide("reject", commentOpt())}
          className="inline-flex items-center gap-1 rounded-md border border-danger/60 px-3 py-1.5 text-sm text-danger transition-colors hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reject<Kbd>R</Kbd>
        </motion.button>
        <motion.button
          type="button"
          disabled={disabled}
          whileTap={disabled ? undefined : { scale: 0.96 }}
          onClick={() => onDecide("approve", commentOpt())}
          className="inline-flex items-center gap-1 rounded-md border border-ok bg-ok/15 px-3 py-1.5 text-sm text-ok transition-colors hover:bg-ok/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Approve<Kbd>A</Kbd>
        </motion.button>
      </div>
    </div>
  );
}
