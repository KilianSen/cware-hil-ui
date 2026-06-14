import { useCallback, useEffect, useState } from "react";
import type { Question, QuestionStatus } from "cware-hil-lib";
import { AnimatePresence, motion } from "motion/react";
import { KeyRound, PlugZap, Search, SearchX, TriangleAlert } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { HistoryCard } from "../components/HistoryCard";
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
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((s) => (
          <motion.button
            key={s}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleStatus(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
              statuses.includes(s)
                ? "border-violet-500 bg-violet-500/15 text-zinc-100"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-200",
            )}
          >
            {s}
          </motion.button>
        ))}
        <div className="relative ml-auto w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-1.5 pl-8 pr-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500"
          />
        </div>
      </div>

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
      ) : error ? (
        <Empty Icon={TriangleAlert}>Couldn’t load history: {error}</Empty>
      ) : visible.length === 0 ? (
        <Empty Icon={SearchX}>{loading ? "Loading…" : "No matching history."}</Empty>
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
                className="rounded-md border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 transition-colors hover:text-zinc-100 disabled:opacity-40"
              >
                {loading ? "Loading…" : "Load more"}
              </motion.button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function Empty({ Icon, children }: { Icon: typeof SearchX; children: React.ReactNode }) {
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
