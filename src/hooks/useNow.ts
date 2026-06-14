import { useEffect, useState } from "react";

/**
 * Returns a value that changes every `intervalMs`, so components rendering
 * relative timestamps ("5m ago") re-render and stay fresh without a reload.
 * The returned number is the current epoch ms at the last tick.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
