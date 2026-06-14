import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/cn";

export interface TabDef {
  id: string;
  label: string;
  render: () => ReactNode;
}

export function Tabs({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const isActive = t.id === current.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                "relative rounded-md border border-edge px-2.5 py-1.5 text-[13px] transition-colors",
                isActive ? "text-ink" : "text-ink-dim hover:text-ink",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-active"
                  className="absolute inset-0 -z-0 rounded-md bg-accent/15 ring-1 ring-accent/40"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div>{current.render()}</div>
    </div>
  );
}
