import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";

/**
 * Shared empty/placeholder state with a bit of HUD character — a framed, dashed
 * console panel with an icon, a message, and an optional action.
 */
export function EmptyState({
  Icon,
  children,
  action,
}: {
  Icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="hud-corners flex flex-col items-center gap-3 rounded-xl border border-dashed border-edge bg-panel/40 px-4 py-12 text-center"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-edge bg-well text-ink-faint">
        <Icon className="h-5 w-5" />
      </span>
      <p className="max-w-sm text-sm text-ink-dim">{children}</p>
      {action}
    </motion.div>
  );
}
