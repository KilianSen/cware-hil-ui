import { useState } from "react";
import type { NotificationLevel } from "cware-hil-lib";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { X } from "lucide-react";
import { useHub } from "../hooks/useHub";
import { useNow } from "../hooks/useNow";
import { relativeTime } from "../lib/format";
import { StatusLed, type LedTone } from "./StatusLed";

const LEVEL: Record<NotificationLevel, LedTone> = {
  info: "idle",
  warn: "warn",
  error: "danger",
};

const COLLAPSED = 8;

/** Persistent notification history (distinct from the transient Toasts). */
export function NotificationsPanel() {
  const { notificationHistory, clearNotifications, removeNotification } = useHub();
  const [expanded, setExpanded] = useState(false);
  useNow();
  if (notificationHistory.length === 0) return null;

  const shown = expanded ? notificationHistory : notificationHistory.slice(0, COLLAPSED);
  const hidden = notificationHistory.length - shown.length;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Notifications (<NumberFlow value={notificationHistory.length} />)
        </h2>
        <button
          type="button"
          onClick={clearNotifications}
          className="ml-auto font-mono text-[10px] uppercase tracking-wider text-ink-faint transition-colors hover:text-ink"
        >
          Clear all
        </button>
      </div>
      <motion.div layout className="space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
              className="group flex items-start gap-2 rounded-lg border border-edge bg-panel px-3 py-2"
            >
              <span className="mt-1 shrink-0">
                <StatusLed tone={LEVEL[n.level]} />
              </span>
              <span className="text-sm text-ink-dim">{n.message}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[11px] text-ink-faint">{relativeTime(n.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => removeNotification(n.id)}
                  aria-label="Dismiss notification"
                  className="rounded text-ink-faint opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 w-full rounded-md border border-edge py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-faint transition-colors hover:text-ink"
        >
          Show {hidden} more
        </button>
      )}
    </section>
  );
}
