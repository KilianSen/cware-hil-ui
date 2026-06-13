import { useState } from "react";
import type { ReactNode } from "react";

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
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={
              "rounded-md border px-2.5 py-1.5 text-[13px] transition-colors " +
              (t.id === current.id
                ? "border-violet-500 bg-violet-500/15 text-zinc-100"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-100")
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{current.render()}</div>
    </div>
  );
}
