import { useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import type { NotificationLevel } from "cware-hil-lib";
import { useHub } from "../hooks/useHub";

/**
 * Bridges hub notifications onto sonner. We keep `useHub`'s notification contract
 * untouched and just mirror each *new* live notification into a sonner toast
 * (tracked by id so we never double-fire across re-renders). Sonner owns the
 * stacking / auto-dismiss / exit animation.
 */
function emit(level: NotificationLevel, message: string) {
  if (level === "error") toast.error(message);
  else if (level === "warn") toast.warning(message);
  else toast.info(message);
}

export function Toasts() {
  const { notifications } = useHub();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const n of notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      emit(n.level, n.message);
    }
  }, [notifications]);

  return (
    <Toaster
      theme="dark"
      richColors
      closeButton
      position="bottom-right"
      toastOptions={{ duration: 6000 }}
    />
  );
}
