import type { Agent } from "cware-hil-lib";
import { relativeTime } from "../lib/format";

const STATUS_STYLES: Record<Agent["status"], string> = {
  idle: "bg-zinc-700 text-zinc-200",
  working: "bg-sky-500/20 text-sky-300",
  waiting: "bg-amber-500/20 text-amber-300",
  done: "bg-emerald-500/20 text-emerald-300",
  error: "bg-red-500/20 text-red-300",
};

export function AgentRow({ agent }: { agent: Agent }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-center gap-2">
        <span className="font-medium text-zinc-100">{agent.label ?? agent.agentId.slice(0, 8)}</span>
        <span className={"rounded px-1.5 py-0.5 text-[11px] font-medium " + STATUS_STYLES[agent.status]}>
          {agent.status}
        </span>
        <span className="ml-auto text-xs text-zinc-500">{relativeTime(agent.lastSeen)}</span>
      </div>
      {agent.currentTask && <div className="mt-1.5 text-sm text-zinc-400">{agent.currentTask}</div>}
      {typeof agent.progress === "number" && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${Math.round(agent.progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
