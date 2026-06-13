import { useState } from "react";

export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-md border px-2 py-1 text-xs transition-colors " +
        (copied
          ? "border-emerald-500 text-emerald-400 "
          : "border-zinc-700 text-zinc-300 hover:border-violet-500 ") +
        className
      }
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
