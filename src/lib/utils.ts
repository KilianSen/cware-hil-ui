import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose conditional Tailwind classes, with later utilities winning conflicts.
 * `cn("px-2", isOn && "px-4")` → `"px-4"`. The canonical shadcn/ui helper.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
