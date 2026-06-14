import { AnimatePresence, motion } from "motion/react";
import { PlugZap } from "lucide-react";
import { useHub } from "../hooks/useHub";

/**
 * Slim banner shown when a token is set but the bridge is down. Signals that the
 * live data may be stale and that answering is paused (cards disable themselves).
 */
export function OfflineBanner() {
  const { enabled, connected } = useHub();
  const show = enabled && !connected;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          className="overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-600 dark:text-amber-500">
            <PlugZap className="size-4 shrink-0 animate-pulse" />
            <span>
              Reconnecting to the hub — live data may be stale and answering is paused until the link
              is back.
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
