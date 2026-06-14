import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "./BrandMark";

/**
 * Shared empty/placeholder state with a bit of identity — a soft, framed panel
 * with a brand watermark, a branded icon chip, an optional serif headline, a
 * supporting line, and an optional action.
 */
export function EmptyState({
  Icon,
  title,
  children,
  action,
}: {
  Icon: LucideIcon;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="from-card/60 to-card/20 relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed bg-gradient-to-b px-6 py-14 text-center"
    >
      <BrandMark className="text-primary pointer-events-none absolute -right-8 -top-8 size-40 opacity-[0.05]" />
      <span className="bg-primary/10 text-primary ring-primary/20 relative flex size-12 items-center justify-center rounded-xl ring-1">
        <Icon className="size-5" />
      </span>
      {title && <p className="font-display mt-1 text-2xl leading-tight">{title}</p>}
      <p className="text-muted-foreground max-w-sm text-sm">{children}</p>
      {action && <div className="mt-1">{action}</div>}
    </motion.div>
  );
}
