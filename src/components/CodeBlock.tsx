import { CopyButton } from "./CopyButton";

export function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <div className="absolute right-2 top-2">
        <CopyButton text={code} />
      </div>
      <pre className="bg-muted text-foreground overflow-x-auto whitespace-pre-wrap break-all rounded-lg border p-3.5 pr-20 font-mono text-[12.5px] leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
