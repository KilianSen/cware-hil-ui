import { useCallback, useEffect, useState } from "react";
import type { Question, QuestionStatus } from "cware-hil-lib";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, KeyRound, PlugZap, Search, SearchX, TriangleAlert } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { HistoryCard } from "../components/HistoryCard";
import { EmptyState } from "../components/EmptyState";
import { cn } from "../lib/cn";

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
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-b border-edge bg-canvas/80 px-4 py-2 backdrop-blur">
        {STATUS_OPTIONS.map((s) => (
          <motion.button
            key={s}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleStatus(s)}
            aria-pressed={statuses.includes(s)}
            className={cn(
              "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors",
              statuses.includes(s)
                ? "border-accent bg-accent/15 text-ink"
                : "border-edge text-ink-dim hover:text-ink",
            )}
          >
            {s}
          </motion.button>
        ))}
        <span className="font-mono text-[11px] text-ink-faint">
          {visible.length} loaded{hasMore ? "+" : ""}
        </span>
        <div className="relative ml-auto w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search history"
            className="w-full rounded-md border border-edge bg-well py-1.5 pl-8 pr-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </div>
      </div>

      {!enabled ? (
        <EmptyState Icon={KeyRound} action={<SetupLink>Open Setup</SetupLink>}>
          No hub token set.
        </EmptyState>
      ) : !connected ? (
        <EmptyState Icon={PlugZap} action={<SetupLink>Check Setup</SetupLink>}>
          Not connected to the hub.
        </EmptyState>
      ) : error ? (
        <EmptyState Icon={TriangleAlert}>Couldn’t load history: {error}</EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState Icon={SearchX}>{loading ? "Loading…" : "No matching history."}</EmptyState>
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((q) => (
              <HistoryCard key={q.id} question={q} />
            ))}
          </AnimatePresence>
          {hasMore && !term && (
            <div className="flex justify-center pt-1">
              <motion.button
                type="button"
                disabled={loading}
                whileTap={{ scale: 0.96 }}
                onClick={() => load(rows[rows.length - 1]?.createdAt)}
                className="rounded-md border border-edge px-4 py-1.5 text-sm text-ink-dim transition-colors hover:border-edge-strong hover:text-ink disabled:opacity-40"
              >
                {loading ? "Loading…" : `Load ${PAGE} more`}
              </motion.button>
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
            className="fixed bottom-5 right-5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-edge-strong bg-panel text-ink-dim shadow-lg shadow-black/30 transition-colors hover:text-ink"
          >
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function SetupLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="#/setup"
      className="rounded-md border border-accent bg-accent/15 px-3 py-1.5 text-sm text-ink transition-colors hover:bg-accent/25"
    >
      {children}
    </a>
  );
}
