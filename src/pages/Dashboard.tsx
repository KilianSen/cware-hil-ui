import { useHub } from "../hooks/useHub";
import { QuestionCard } from "../components/QuestionCard";
import { AgentRow } from "../components/AgentRow";

export function Dashboard() {
  const { enabled, connected, questions, agents } = useHub();

  const agentLabel = (agentId: string) => agents.find((a) => a.agentId === agentId)?.label;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Pending questions ({questions.length})
        </h2>
        {!enabled ? (
          <Empty>Set a token above to connect to a hub.</Empty>
        ) : !connected ? (
          <Empty>Not connected to the hub.</Empty>
        ) : questions.length === 0 ? (
          <Empty>Nothing waiting on you.</Empty>
        ) : (
          <div className="space-y-3">
            {questions.map((q) => (
              <QuestionCard key={q.id} question={q} agentLabel={agentLabel(q.agentId)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Agents ({agents.length})
        </h2>
        {agents.length === 0 ? (
          <Empty>No agents yet.</Empty>
        ) : (
          <div className="space-y-2">
            {agents.map((a) => (
              <AgentRow key={a.agentId} agent={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}
