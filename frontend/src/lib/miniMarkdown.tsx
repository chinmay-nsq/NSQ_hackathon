import { Fragment, type ReactNode } from "react";

/**
 * Small, purpose-built markdown renderer for companion chat replies — never
 * uses dangerouslySetInnerHTML, so there's no injection surface. Covers
 * exactly what the chat system prompt is told it may use: **bold**,
 * `inline code`, fenced ```code blocks```, and -/1. lists. Anything else is
 * left as plain text rather than half-parsed.
 */
export function renderMiniMarkdown(text: string): ReactNode {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => (
        <Fragment key={i}>{renderBlock(block)}</Fragment>
      ))}
    </>
  );
}

function renderBlock(block: string): ReactNode {
  const fenceMatch = block.match(/^```(?:\w+)?\n?([\s\S]*?)```$/);
  if (fenceMatch) {
    return (
      <pre className="my-1.5 overflow-x-auto rounded-lg bg-background/80 p-2.5 font-mono text-xs">
        <code>{fenceMatch[1].replace(/\n$/, "")}</code>
      </pre>
    );
  }

  const lines = block.split("\n").filter((l) => l.trim().length > 0);
  const isBulletList = lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l.trim()));
  const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+[.)]\s+/.test(l.trim()));

  if (isBulletList) {
    return (
      <ul className="my-1 list-disc space-y-0.5 pl-4">
        {lines.map((l, i) => (
          <li key={i}>{renderInline(l.trim().replace(/^[-*]\s+/, ""))}</li>
        ))}
      </ul>
    );
  }

  if (isNumberedList) {
    return (
      <ol className="my-1 list-decimal space-y-0.5 pl-4">
        {lines.map((l, i) => (
          <li key={i}>{renderInline(l.trim().replace(/^\d+[.)]\s+/, ""))}</li>
        ))}
      </ol>
    );
  }

  return <p className="[&:not(:first-child)]:mt-1.5">{renderInline(block)}</p>;
}

function renderInline(text: string): ReactNode {
  // Split on **bold** and `code` spans, alternating plain/formatted segments.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
