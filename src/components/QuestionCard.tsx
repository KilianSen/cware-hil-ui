import { useState } from "react";
import type { Answer, Question } from "cware-hil-lib";
import { useHub } from "../hooks/useHub";

const KIND_LABEL: Record<Question["kind"], string> = {
  ask_user: "ask user",
  ask_choice: "ask choice",
  request_approval: "request approval",
};

export function QuestionCard({ question, agentLabel }: { question: Question; agentLabel?: string }) {
  const { submitAnswer, cancelQuestion } = useHub();
  const send = (a: Answer) => submitAnswer(a);
  const now = () => new Date().toISOString();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-zinc-400">
          {KIND_LABEL[question.kind]}
        </span>
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
        <button
          type="button"
          onClick={() => cancelQuestion(question.id)}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

const textareaCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500";
const primaryCls =
  "rounded-md border border-violet-500 bg-violet-500/15 px-3 py-1.5 text-sm text-zinc-100 hover:bg-violet-500/25";

function AskUser({ prompt, onSubmit }: { prompt?: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      {prompt && <p className="whitespace-pre-wrap text-sm text-zinc-400">{prompt}</p>}
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer…"
        className={textareaCls}
      />
      <div className="flex justify-end">
        <button type="button" className={primaryCls} onClick={() => onSubmit(text)}>
          Submit
        </button>
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

  return (
    <div className="space-y-2">
      {question.prompt && <p className="whitespace-pre-wrap text-sm text-zinc-400">{question.prompt}</p>}
      <div className="space-y-1">
        {(question.choices ?? []).map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
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
        placeholder="Add a note (optional)…"
        className={textareaCls}
      />
      <div className="flex justify-end">
        <button
          type="button"
          className={primaryCls}
          onClick={() => onSubmit(selected, note.trim() || undefined)}
        >
          Submit
        </button>
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
  return (
    <div className="space-y-2">
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
        <button
          type="button"
          onClick={() => onDecide("reject", comment.trim() || undefined)}
          className="rounded-md border border-red-500/60 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/15"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => onDecide("approve", comment.trim() || undefined)}
          className="rounded-md border border-emerald-500 bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-500/25"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
