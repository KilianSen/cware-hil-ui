import { useCallback, useEffect, useState } from "react";
import type { Question, QuestionStatus } from "cware-hil-lib";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, KeyRound, PlugZap, Search, SearchX, TriangleAlert } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { HistoryCard } from "../components/HistoryCard";
import { EmptyState } from "../components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";

const STATUS_OPTIONS: QuestionStatus[] = ["answered", "cancelled", "expired", "pending"];
const PAGE = 30;

export function History() {
  const { enabled, connected, requestHistory } = useHub();
  const [statuses, setStatuses] = useState<QuestionStatus[]>(["answered"]);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Question[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      if (!connected) return;
      setLoading(true);
      setError(null);
      try {
        const res = await requestHistory({
          statuses: statuses.length ? statuses : undefined,
          limit: PAGE,
          before,
        });
        setRows((prev) => (before ? [...prev, ...res.questions] : res.questions));
        setHasMore(res.hasMore);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [connected, requestHistory, statuses],
  );

  // Reload whenever the filters or connection change.
  useEffect(() => {
    if (connected) void load();
    else setRows([]);
  }, [connected, load]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleStatus = (s: QuestionStatus) =>
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const term = search.trim().toLowerCase();
  const visible = term
    ? rows.filter((q) =>
        [q.title, q.prompt, q.approval?.body, q.answer?.text, q.answer?.comment]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(term)),
      )
    : rows;

  return (
    <div className="space-y-4">
      <div className="bg-background/80 sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-b px-4 py-2 backdrop-blur">
        {STATUS_OPTIONS.map((s) => (
          <Toggle
            key={s}
            size="sm"
            variant="outline"
            pressed={statuses.includes(s)}
            onPressedChange={() => toggleStatus(s)}
            className="h-8 rounded-full px-3 text-xs capitalize"
          >
            {s}
          </Toggle>
        ))}
        <span className="text-muted-foreground text-xs">
          {visible.length} loaded{hasMore ? "+" : ""}
        </span>
        <div className="relative ml-auto w-48">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search history"
            className="h-8 pl-8"
          />
        </div>
      </div>

      {!enabled ? (
        <EmptyState Icon={KeyRound} title="Connect your hub" action={<SetupLink>Open Setup</SetupLink>}>
          No hub token set yet.
        </EmptyState>
      ) : !connected ? (
        <EmptyState Icon={PlugZap} title="Reconnecting…" action={<SetupLink>Check Setup</SetupLink>}>
          We can’t reach the hub right now.
        </EmptyState>
      ) : error ? (
        <EmptyState Icon={TriangleAlert} title="Couldn’t load history">
          {error}
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState Icon={SearchX} title={loading ? "Loading…" : "Nothing here"}>
          {loading ? "Fetching past questions…" : "No past questions match these filters."}
        </EmptyState>
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((q) => (
              <HistoryCard key={q.id} question={q} />
            ))}
          </AnimatePresence>
          {hasMore && !term && (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => load(rows[rows.length - 1]?.createdAt)}
              >
                {loading ? "Loading…" : `Load ${PAGE} more`}
              </Button>
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {showTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-5 right-5 z-20"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Scroll to top"
              className="bg-card rounded-full shadow-lg"
            >
              <ArrowUp className="size-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
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
