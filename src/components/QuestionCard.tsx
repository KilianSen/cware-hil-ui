import { useRef, useState } from "react";
import type { Answer, Question } from "cware-hil-lib";
import { motion } from "motion/react";
import { useHotkeys } from "react-hotkeys-hook";
import { ListChecks, MessageSquare, ShieldCheck, X } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { useNow } from "../hooks/useNow";
import { relativeTime } from "../lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const KIND: Record<Question["kind"], { label: string; Icon: typeof MessageSquare }> = {
  ask_user: { label: "Question", Icon: MessageSquare },
  ask_choice: { label: "Choice", Icon: ListChecks },
  request_approval: { label: "Approval", Icon: ShieldCheck },
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
  const { submitAnswer, cancelQuestion, connected, isAdmin } = useHub();
  useNow(); // keep the "Xm ago" timestamp fresh
  const send = (a: Answer) => submitAnswer(a);
  const now = () => new Date().toISOString();
  const kind = KIND[question.kind];
  const high = question.priority === "high";
  const active = selected && connected;

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
        "bg-card text-card-foreground rounded-xl border p-4 shadow-sm transition-all hover:shadow-md",
        high && "border-l-2 border-l-destructive",
        selected && "ring-ring ring-2 ring-offset-2 ring-offset-background",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium leading-snug">{question.title}</div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
            <kind.Icon className="size-3.5" />
            <span>{kind.label}</span>
            {agentLabel && (
              <>
                <span className="text-border">·</span>
                <span className="truncate">{agentLabel}</span>
              </>
            )}
            <span className="text-border">·</span>
            <span>{relativeTime(question.createdAt)}</span>
          </div>
        </div>
        {high && (
          <Badge variant="destructive" className="shrink-0">
            High
          </Badge>
        )}
      </div>

      {question.kind === "ask_user" && (
        <AskUser
          prompt={question.prompt}
          disabled={!connected}
          active={active}
          onSubmit={(text) =>
            send({ questionId: question.id, kind: "ask_user", text, answeredAt: now() })
          }
        />
      )}
      {question.kind === "ask_choice" && (
        <AskChoice
          question={question}
          disabled={!connected}
          active={active}
          onSubmit={(choiceIds, text) =>
            send({ questionId: question.id, kind: "ask_choice", choiceIds, text, answeredAt: now() })
          }
        />
      )}
      {question.kind === "request_approval" && (
        <Approval
          question={question}
          disabled={!connected}
          active={active}
          onDecide={(decision, comment) =>
            send({
              questionId: question.id,
              kind: "request_approval",
              decision,
              comment,
              answeredAt: now(),
            })
          }
        />
      )}

      <div className="mt-3 flex items-center justify-between">
        {!connected ? (
          <span className="text-xs text-amber-600 dark:text-amber-500">paused · reconnecting</span>
        ) : (
          <span />
        )}
        {isAdmin ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => cancelQuestion(question.id)}
            aria-label="Dismiss question"
          >
            <X className="size-3.5" /> Dismiss
          </Button>
        ) : (
          <span />
        )}
      </div>
    </motion.div>
  );
}

/** ⌘/Ctrl+Enter to submit from a textarea. */
function submitChord(e: React.KeyboardEvent, run: () => void) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    run();
  }
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none">
      {children}
    </kbd>
  );
}

/** A subtle one-line keyboard hint, shown only on the selected card. */
function Hint({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">{children}</div>
  );
}

function AskUser({
  prompt,
  disabled,
  active,
  onSubmit,
}: {
  prompt?: string;
  disabled?: boolean;
  active: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const sent = useRef(false);
  const submit = () => {
    if (sent.current) return;
    sent.current = true;
    onSubmit(text);
  };

  // When the card is selected, Enter drops you straight into the answer field.
  useHotkeys(
    "enter",
    (e) => {
      e.preventDefault();
      ref.current?.focus();
    },
    { enabled: active && !disabled, enableOnFormTags: false },
    [active, disabled],
  );

  return (
    <div className="space-y-2">
      {prompt && <p className="text-muted-foreground whitespace-pre-wrap text-sm">{prompt}</p>}
      <Textarea
        ref={ref}
        rows={3}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => submitChord(e, submit)}
        placeholder="Type your answer…"
      />
      <div className="flex items-center justify-between gap-2">
        <Hint show={active}>
          <Kbd>↵</Kbd> to write
          <span className="text-border">·</span>
          <Kbd>⌘↵</Kbd> send
        </Hint>
        <Button type="button" size="sm" disabled={disabled} onClick={submit}>
          Submit
          <Kbd>⌘↵</Kbd>
        </Button>
      </div>
    </div>
  );
}

function AskChoice({
  question,
  disabled,
  active,
  onSubmit,
}: {
  question: Question;
  disabled?: boolean;
  active: boolean;
  onSubmit: (choiceIds: string[], note?: string) => void;
}) {
  const multi = question.multi ?? false;
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const sent = useRef(false);
  const choices = question.choices ?? [];

  const toggle = (id: string) => {
    if (multi) setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    else setSelected([id]);
  };
  const submit = () => {
    if (sent.current || selected.length === 0) return;
    sent.current = true;
    onSubmit(selected, note.trim() || undefined);
  };

  // Number keys pick a choice; Enter submits — both only on the selected card,
  // and never while typing in the note field (enableOnFormTags: false).
  useHotkeys(
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    (e) => {
      const c = choices[Number(e.key) - 1];
      if (c) toggle(c.id);
    },
    { enabled: active && !disabled, enableOnFormTags: false },
    [active, disabled, choices, multi],
  );
  useHotkeys(
    "enter",
    (e) => {
      e.preventDefault();
      submit();
    },
    { enabled: active && !disabled, enableOnFormTags: false },
    [active, disabled, selected, note],
  );

  return (
    <div className="space-y-2">
      {question.prompt && (
        <p className="text-muted-foreground whitespace-pre-wrap text-sm">{question.prompt}</p>
      )}

      {multi ? (
        <div role="group" aria-label="Choices" className="space-y-1">
          {choices.map((c, i) => {
            const id = `q-${question.id}-${c.id}`;
            return (
              <div
                key={c.id}
                className="hover:bg-accent flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm"
              >
                <Checkbox
                  id={id}
                  checked={selected.includes(c.id)}
                  disabled={disabled}
                  onCheckedChange={() => toggle(c.id)}
                />
                <Label htmlFor={id} className="flex flex-1 cursor-pointer items-center gap-2 font-normal">
                  {i < 9 && <ChoiceKey>{i + 1}</ChoiceKey>}
                  {c.label}
                </Label>
              </div>
            );
          })}
        </div>
      ) : (
        <RadioGroup
          aria-label="Choices"
          value={selected[0] ?? ""}
          onValueChange={(v) => setSelected([v])}
          disabled={disabled}
          className="gap-1"
        >
          {choices.map((c, i) => {
            const id = `q-${question.id}-${c.id}`;
            return (
              <div
                key={c.id}
                className="hover:bg-accent flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm"
              >
                <RadioGroupItem id={id} value={c.id} />
                <Label htmlFor={id} className="flex flex-1 cursor-pointer items-center gap-2 font-normal">
                  {i < 9 && <ChoiceKey>{i + 1}</ChoiceKey>}
                  {c.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      )}

      <Textarea
        rows={2}
        value={note}
        disabled={disabled}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => submitChord(e, submit)}
        placeholder="Add a note (optional)…"
      />
      <div className="flex items-center justify-between gap-2">
        <Hint show={active}>
          <Kbd>{choices.length > 1 ? `1–${Math.min(choices.length, 9)}` : "1"}</Kbd> choose
          <span className="text-border">·</span>
          <Kbd>↵</Kbd> submit
        </Hint>
        <Button type="button" size="sm" disabled={disabled || selected.length === 0} onClick={submit}>
          Submit
          <Kbd>↵</Kbd>
        </Button>
      </div>
    </div>
  );
}

function ChoiceKey({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex size-4 shrink-0 items-center justify-center rounded font-mono text-[10px] leading-none">
      {children}
    </span>
  );
}

function Approval({
  question,
  disabled,
  active,
  onDecide,
}: {
  question: Question;
  disabled?: boolean;
  active: boolean;
  onDecide: (decision: "approve" | "reject", comment?: string) => void;
}) {
  const [comment, setComment] = useState("");
  const a = question.approval;
  const sent = useRef(false);
  const decide = (decision: "approve" | "reject") => {
    if (sent.current) return;
    sent.current = true;
    onDecide(decision, comment.trim() || undefined);
  };

  // A / R decide on the selected card — never while typing in the comment.
  useHotkeys("a", () => decide("approve"), { enabled: active && !disabled, enableOnFormTags: false }, [
    active,
    disabled,
    comment,
  ]);
  useHotkeys("r", () => decide("reject"), { enabled: active && !disabled, enableOnFormTags: false }, [
    active,
    disabled,
    comment,
  ]);

  return (
    <div className="space-y-2">
      {a?.body && <p className="text-muted-foreground whitespace-pre-wrap text-sm">{a.body}</p>}
      {a?.diff && (
        <pre className="bg-muted text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all rounded-lg border p-3 font-mono text-[12px]">
          {a.diff}
        </pre>
      )}
      <Input
        type="text"
        value={comment}
        disabled={disabled}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (optional)…"
      />
      <div className="flex items-center justify-between gap-2">
        <Hint show={active}>
          <Kbd>A</Kbd> approve
          <span className="text-border">·</span>
          <Kbd>R</Kbd> reject
        </Hint>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={disabled}
            onClick={() => decide("reject")}
          >
            Reject
            <Kbd>R</Kbd>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => decide("approve")}
            className="bg-emerald-600 text-white hover:bg-emerald-600/90"
          >
            Approve
            <Kbd>A</Kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
