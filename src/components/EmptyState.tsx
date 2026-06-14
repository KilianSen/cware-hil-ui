import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";

/**
 * Shared empty/placeholder state — a dashed, framed card with an icon, a
 * message, and an optional action.
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
      className="bg-card/40 flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center"
    >
      <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg border">
        <Icon className="size-5" />
      </span>
      <p className="text-muted-foreground max-w-sm text-sm">{children}</p>
      {action}
    </motion.div>
  );
}
