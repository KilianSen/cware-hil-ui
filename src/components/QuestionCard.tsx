import { useState } from "react";
import type { Answer, Question } from "cware-hil-lib";
import { motion } from "motion/react";
import { useHotkeys } from "react-hotkeys-hook";
import { ListChecks, MessageSquare, ShieldCheck, X } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { cn } from "../lib/cn";

const KIND: Record<Question["kind"], { label: string; Icon: typeof MessageSquare }> = {
  ask_user: { label: "ask user", Icon: MessageSquare },
  ask_choice: { label: "ask choice", Icon: ListChecks },
  request_approval: { label: "request approval", Icon: ShieldCheck },
};

export function QuestionCard({ question, agentLabel }: { question: Question; agentLabel?: string }) {
  const { submitAnswer, cancelQuestion } = useHub();
  const send = (a: Answer) => submitAnswer(a);
  const now = () => new Date().toISOString();
  const kind = KIND[question.kind];
  const high = question.priority === "high";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      className={cn(
        "rounded-xl border bg-zinc-900 p-4",
        high ? "border-l-2 border-l-prio-high border-zinc-800" : "border-zinc-800",
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-zinc-400">
          <kind.Icon className="h-3 w-3" />
          {kind.label}
        </span>
        {question.priority && question.priority !== "normal" && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
              question.priority === "high" ? "bg-red-500/20 text-red-300" : "bg-zinc-800 text-zinc-400",
            )}
          >
            {question.priority}
          </span>
        )}
        {agentLabel && <span className="text-xs text-zinc-500">{agentLabel}</span>}
      </div>
      <div className="mb-2 font-medium text-zinc-100">{question.title}</div>

      {question.kind === "ask_user" && (
        <AskUser onSubmit={(text) => send({ questionId: question.id, kind: "ask_user", text, answeredAt: now() })} prompt={question.prompt} />
      )}
      {question.kind === "ask_choice" && (
        <AskChoice
          question={question}
          onSubmit={(choiceIds, text) =>
            send({ questionId: question.id, kind: "ask_choice", choiceIds, text, answeredAt: now() })
          }
        />
      )}
      {question.kind === "request_approval" && (
        <Approval
          question={question}
          onDecide={(decision, comment) =>
            send({ questionId: question.id, kind: "request_approval", decision, comment, answeredAt: now() })
          }
        />
      )}

      <div className="mt-3 flex justify-end">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => cancelQuestion(question.id)}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <X className="h-3.5 w-3.5" /> Dismiss
        </motion.button>
      </div>
    </motion.div>
  );
}

const textareaCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500";
const primaryCls =
  "inline-flex items-center gap-1.5 rounded-md border border-violet-500 bg-violet-500/15 px-3 py-1.5 text-sm text-zinc-100 hover:bg-violet-500/25";

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

function AskUser({ prompt, onSubmit }: { prompt?: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      {prompt && <p className="whitespace-pre-wrap text-sm text-zinc-400">{prompt}</p>}
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => submitChord(e, () => onSubmit(text))}
        placeholder="Type your answer…"
        className={textareaCls}
      />
      <div className="flex justify-end">
        <motion.button type="button" whileTap={{ scale: 0.96 }} className={primaryCls} onClick={() => onSubmit(text)}>
          Submit<Kbd>⌘↵</Kbd>
        </motion.button>
      </div>
    </div>
  );
}

function AskChoice({
  question,
  onSubmit,
}: {
  question: Question;
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
      {question.prompt && <p className="whitespace-pre-wrap text-sm text-zinc-400">{question.prompt}</p>}
      <div className="space-y-1">
        {(question.choices ?? []).map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-800/50">
            <input
              type={multi ? "checkbox" : "radio"}
              name={`q-${question.id}`}
              checked={selected.includes(c.id)}
              onChange={() => toggle(c.id)}
              className="accent-violet-500"
            />
            {c.label}
          </label>
        ))}
      </div>
      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => submitChord(e, submit)}
        placeholder="Add a note (optional)…"
        className={textareaCls}
      />
      <div className="flex justify-end">
        <motion.button type="button" whileTap={{ scale: 0.96 }} className={primaryCls} onClick={submit}>
          Submit<Kbd>⌘↵</Kbd>
        </motion.button>
      </div>
    </div>
  );
}

function Approval({
  question,
  onDecide,
}: {
  question: Question;
  onDecide: (decision: "approve" | "reject", comment?: string) => void;
}) {
  const [comment, setComment] = useState("");
  const a = question.approval;
  const commentOpt = () => comment.trim() || undefined;

  // `a`/`r` while the card is focused (not while typing in the comment field).
  const hotRef = useHotkeys<HTMLDivElement>(
    "a, r",
    (_e, h) => {
      if (h.keys?.includes("r")) onDecide("reject", commentOpt());
      else onDecide("approve", commentOpt());
    },
    { preventDefault: true },
  );

  return (
    <div ref={hotRef} tabIndex={-1} className="space-y-2 outline-none">
      {a?.body && <p className="whitespace-pre-wrap text-sm text-zinc-400">{a.body}</p>}
      {a?.diff && (
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[12px] text-zinc-300">
          {a.diff}
        </pre>
      )}
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (optional)…"
        className={textareaCls}
      />
      <div className="flex justify-end gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => onDecide("reject", commentOpt())}
          className="inline-flex items-center gap-1 rounded-md border border-red-500/60 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/15"
        >
          Reject<Kbd>R</Kbd>
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => onDecide("approve", commentOpt())}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-500 bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-500/25"
        >
          Approve<Kbd>A</Kbd>
        </motion.button>
      </div>
    </div>
  );
}
