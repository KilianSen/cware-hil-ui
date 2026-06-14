import { useMemo, useState } from "react";
import type { Question, QuestionKind } from "cware-hil-lib";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { Inbox, KeyRound, PlugZap, SearchX, Users } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { QuestionCard } from "../components/QuestionCard";
import { AgentRow } from "../components/AgentRow";
import { NotificationsPanel } from "../components/NotificationsPanel";
import { cn } from "../lib/cn";

const KIND_FILTERS: { key: QuestionKind; label: string }[] = [
  { key: "ask_user", label: "ask user" },
  { key: "ask_choice", label: "ask choice" },
  { key: "request_approval", label: "approval" },
];

type Sort = "newest" | "oldest" | "priority";
const PRIORITY_RANK: Record<NonNullable<Question["priority"]>, number> = { high: 0, normal: 1, low: 2 };
const rank = (q: Question) => PRIORITY_RANK[q.priority ?? "normal"];

export function Dashboard() {
  const { enabled, connected, questions, agents } = useHub();
  const [kinds, setKinds] = useState<QuestionKind[]>([]);
  const [sort, setSort] = useState<Sort>("newest");
  const [search, setSearch] = useState("");

  const agentLabel = (agentId: string) => agents.find((a) => a.agentId === agentId)?.label;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = questions;
    if (kinds.length) list = list.filter((q) => kinds.includes(q.kind));
    if (term)
      list = list.filter((q) =>
        [q.title, q.prompt, q.approval?.body].filter(Boolean).some((s) => s!.toLowerCase().includes(term)),
      );
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "priority") {
        const d = rank(a) - rank(b);
        if (d !== 0) return d;
        return b.createdAt.localeCompare(a.createdAt);
      }
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return sort === "oldest" ? cmp : -cmp;
    });
    return sorted;
  }, [questions, kinds, sort, search]);

  const toggleKind = (k: QuestionKind) =>
    setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Pending questions (<NumberFlow value={visible.length} />)
          </h2>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {KIND_FILTERS.map((f) => (
              <motion.button
                key={f.key}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleKind(f.key)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                  kinds.includes(f.key)
                    ? "border-violet-500 bg-violet-500/15 text-zinc-100"
                    : "border-zinc-700 text-zinc-400 hover:text-zinc-200",
                )}
              >
                {f.label}
              </motion.button>
            ))}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300 outline-none focus:border-violet-500"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        {enabled && connected && questions.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pending…"
            className="mb-3 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500"
          />
        )}

        {!enabled ? (
          <Empty Icon={KeyRound}>
            No hub token set.{" "}
            <a href="#/setup" className="text-violet-400 hover:underline">Open Setup</a> to connect.
          </Empty>
        ) : !connected ? (
          <Empty Icon={PlugZap}>
            Not connected to the hub.{" "}
            <a href="#/setup" className="text-violet-400 hover:underline">Check Setup</a>.
          </Empty>
        ) : questions.length === 0 ? (
          <Empty Icon={Inbox}>Nothing waiting on you.</Empty>
        ) : visible.length === 0 ? (
          <Empty Icon={SearchX}>No questions match the current filters.</Empty>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((q) => (
                <QuestionCard key={q.id} question={q} agentLabel={agentLabel(q.agentId)} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Agents (<NumberFlow value={agents.length} />)
          </h2>
          {agents.length === 0 ? (
            <Empty Icon={Users}>No agents yet.</Empty>
          ) : (
            <motion.div layout className="space-y-2">
              <AnimatePresence initial={false} mode="popLayout">
                {agents.map((a) => (
                  <AgentRow key={a.agentId} agent={a} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
        <NotificationsPanel />
      </div>
    </div>
  );
}

function Empty({ Icon, children }: { Icon: typeof Inbox; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500"
    >
      <Icon className="h-5 w-5 text-zinc-600" />
      {children}
    </motion.div>
  );
}
