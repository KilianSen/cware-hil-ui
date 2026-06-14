import { CopyButton } from "./CopyButton";

export function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <div className="absolute right-2 top-2">
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-edge bg-well p-3.5 pr-16 font-mono text-[12.5px] leading-relaxed text-ink">
        {code}
      </pre>
    </div>
  );
}
