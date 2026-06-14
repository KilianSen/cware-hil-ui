import { useEffect, useMemo, useRef, useState } from "react";
import type { Question, QuestionKind } from "cware-hil-lib";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { useHotkeys } from "react-hotkeys-hook";
import { Inbox, KeyRound, ListFilter, PlugZap, Search, SearchX, Users } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { QuestionCard } from "../components/QuestionCard";
import { AgentRow } from "../components/AgentRow";
import { NotificationsPanel } from "../components/NotificationsPanel";
import { EmptyState } from "../components/EmptyState";
import { onUi } from "../lib/bus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KIND_FILTERS: { key: QuestionKind; label: string }[] = [
  { key: "ask_user", label: "ask_user" },
  { key: "ask_choice", label: "ask_choice" },
  { key: "request_approval", label: "approval" },
];

type Sort = "newest" | "oldest" | "priority";
const PRIORITY_RANK: Record<NonNullable<Question["priority"]>, number> = {
  high: 0,
  normal: 1,
  low: 2,
};
const rank = (q: Question) => PRIORITY_RANK[q.priority ?? "normal"];

export function Dashboard() {
  const { enabled, connected, questions, agents } = useHub();
  const [kinds, setKinds] = useState<QuestionKind[]>([]);
  const [sort, setSort] = useState<Sort>("newest");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const agentLabel = (agentId: string) => agents.find((a) => a.agentId === agentId)?.label;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = questions;
    if (kinds.length) list = list.filter((q) => kinds.includes(q.kind));
    if (term)
      list = list.filter((q) =>
        [q.title, q.prompt, q.approval?.body]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(term)),
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

  const filtersActive = kinds.length > 0 || search.trim().length > 0;
  const toggleKind = (k: QuestionKind) =>
    setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  const clearFilters = () => {
    setKinds([]);
    setSearch("");
  };

  // Keep the triage cursor in range as the list changes.
  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, visible.length - 1)));
  }, [visible.length]);

  // Scroll the selected card into view as the cursor moves.
  useEffect(() => {
    const el = document.querySelector('[data-question-card][data-selected="true"]');
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [cursor]);

  // Latest list length, read from keyboard handlers without re-binding them.
  const lenRef = useRef(0);
  lenRef.current = visible.length;
  const moveNext = () => setCursor((c) => Math.min(c + 1, Math.max(0, lenRef.current - 1)));
  const movePrev = () => setCursor((c) => Math.max(c - 1, 0));

  const openSelected = () => {
    const el = document.querySelector('[data-question-card][data-selected="true"]');
    const field = el?.querySelector<HTMLElement>("textarea, input, [tabindex]");
    field?.focus();
  };

  // j/k move the triage cursor between pending cards. Answering itself (number
  // keys, Enter, A/R, type-to-write) is handled on the selected card.
  useHotkeys("j", moveNext);
  useHotkeys("k", movePrev);
  useHotkeys("/", (e) => {
    e.preventDefault();
    searchRef.current?.focus();
  });

  // Commands relayed from the palette.
  useEffect(
    () =>
      onUi((ev) => {
        if (ev.type === "focus-search") searchRef.current?.focus();
        else if (ev.type === "question-next") moveNext();
        else if (ev.type === "question-prev") movePrev();
        else if (ev.type === "question-open") openSelected();
      }),
    [],
  );

  const selectedId = visible[cursor]?.id;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <h2 className="text-xl font-semibold tracking-tight">Pending</h2>
          <span className="bg-muted text-muted-foreground inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 font-mono text-xs tabular-nums">
            <NumberFlow value={visible.length} />
          </span>
          {visible.length > 1 && (
            <span className="text-muted-foreground ml-auto hidden items-center gap-1 text-xs sm:flex">
              <kbd>j</kbd>
              <kbd>k</kbd>
              <span className="ml-0.5">to move</span>
            </span>
          )}
        </div>

        {enabled && connected && questions.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pending…"
                aria-label="Search pending questions"
                className="pl-8"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="shrink-0">
                  <ListFilter />
                  Type
                  {kinds.length > 0 && (
                    <Badge variant="secondary" className="ml-0.5 px-1.5">
                      {kinds.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {KIND_FILTERS.map((f) => (
                  <DropdownMenuCheckboxItem
                    key={f.key}
                    checked={kinds.includes(f.key)}
                    onCheckedChange={() => toggleKind(f.key)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {f.label}
                  </DropdownMenuCheckboxItem>
                ))}
                {filtersActive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={clearFilters}>Clear filters</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger aria-label="Sort questions" className="shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {!enabled ? (
          <EmptyState
            Icon={KeyRound}
            title="Connect your hub"
            action={<SetupLink>Open Setup</SetupLink>}
          >
            No hub token set yet. Add one to start receiving questions from your agents.
          </EmptyState>
        ) : !connected ? (
          <EmptyState
            Icon={PlugZap}
            title="Reconnecting…"
            action={<SetupLink>Check Setup</SetupLink>}
          >
            We can’t reach the hub right now. Answering is paused until the link is back.
          </EmptyState>
        ) : questions.length === 0 ? (
          <EmptyState Icon={Inbox} title="All clear">
            Nothing is waiting on you. New questions from your agents will land here.
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState Icon={SearchX} title="No matches">
            No pending questions match the current filters.
          </EmptyState>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  agentLabel={agentLabel(q.agentId)}
                  selected={q.id === selectedId}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <div className="space-y-8">
        <section>
          <h2 className="text-muted-foreground mb-3 flex items-baseline gap-1.5 text-sm font-medium">
            Agents
            <span className="tabular-nums">
              <NumberFlow value={agents.length} />
            </span>
          </h2>
          {agents.length === 0 ? (
            <EmptyState Icon={Users}>No agents connected yet.</EmptyState>
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

function SetupLink({ children }: { children: React.ReactNode }) {
  return (
    <Button asChild size="sm">
      <a href="#/setup">{children}</a>
    </Button>
  );
}
