import type { NotificationLevel } from "cware-hil-lib";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { relativeTime } from "../lib/format";
import { cn } from "../lib/cn";

const LEVEL: Record<NotificationLevel, { dot: string; tone: string; Icon: typeof Info }> = {
  info: { dot: "bg-zinc-500", tone: "text-zinc-400", Icon: Info },
  warn: { dot: "bg-amber-400", tone: "text-amber-300", Icon: AlertTriangle },
  error: { dot: "bg-red-500", tone: "text-red-300", Icon: XCircle },
};

/** Persistent notification history (distinct from the transient Toasts). */
export function NotificationsPanel() {
  const { notificationHistory } = useHub();
  if (notificationHistory.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Notifications (<NumberFlow value={notificationHistory.length} />)
      </h2>
      <motion.div layout className="space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {notificationHistory.slice(0, 30).map((n) => {
            const l = LEVEL[n.level];
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
              >
                <l.Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", l.tone)} />
                <span className="text-sm text-zinc-300">{n.message}</span>
                <span className="ml-auto shrink-0 text-xs text-zinc-600">{relativeTime(n.createdAt)}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
