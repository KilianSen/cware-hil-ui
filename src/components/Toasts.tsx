import { useEffect } from "react";
import type { NotificationLevel } from "cware-hil-lib";
import { useHub } from "../hooks/useHub";

const LEVEL_STYLES: Record<NotificationLevel, string> = {
  info: "border-zinc-700 bg-zinc-900 text-zinc-200",
  warn: "border-amber-600/60 bg-amber-950/40 text-amber-200",
  error: "border-red-600/60 bg-red-950/40 text-red-200",
};

export function Toasts() {
  const { notifications, dismissNotification } = useHub();
  // Show the most recent few.
  const shown = notifications.slice(-4);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[90vw] flex-col gap-2">
      {shown.map((n) => (
        <Toast key={n.id} id={n.id} level={n.level} message={n.message} onDismiss={dismissNotification} />
      ))}
    </div>
  );
}

function Toast({
  id,
  level,
  message,
  onDismiss,
}: {
  id: string;
  level: NotificationLevel;
  message: string;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), 6000);
    return () => clearTimeout(t);
  }, [id, onDismiss]);

  return (
    <div
      className={"pointer-events-auto cursor-pointer rounded-lg border px-3 py-2 text-sm shadow-lg " + LEVEL_STYLES[level]}
      onClick={() => onDismiss(id)}
    >
      {message}
    </div>
  );
}
