import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small, purpose-built markdown renderer for companion chat replies — never
 * uses dangerouslySetInnerHTML, so there's no injection surface. Covers
 * exactly what the chat system prompt is told it may use: **bold**,
 * `inline code`, fenced ```code blocks```, and -/1. lists. Anything else is
 * left as plain text rather than half-parsed.
 */
export function renderMiniMarkdown(text: string): ReactNode {
  const blocks = normalizeInlineBullets(text).split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => (
        <Fragment key={i}>{renderBlock(block)}</Fragment>
      ))}
    </>
  );
}

/**
 * Fallback for a model slip we've actually seen: writing a list inline in
 * one sentence separated by " * " instead of real line breaks (e.g. "I can:
 * * do X * do Y * do Z"). Requires 2+ occurrences of " * " so a single
 * legitimate mid-sentence asterisk (rare, but possible) isn't mistaken for a
 * list start.
 */
function normalizeInlineBullets(text: string): string {
  const marker = / \* /g;
  const matches = text.match(marker);
  if (!matches || matches.length < 2) return text;
  return text.replace(marker, "\n- ");
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
  const isBulletLine = (l: string) => /^[-*]\s+/.test(l.trim());
  const isNumberedLine = (l: string) => /^\d+[.)]\s+/.test(l.trim());

  // A block can be a plain intro line followed by a list (common when a
  // reply says "Here's what I can do:" then enumerates) — not just a block
  // that's a list top to bottom. Find where the list actually starts.
  const listStart = lines.findIndex((l) => isBulletLine(l) || isNumberedLine(l));
  if (listStart === -1) {
    return <p className="[&:not(:first-child)]:mt-1.5">{renderInline(block)}</p>;
  }

  const intro = lines.slice(0, listStart);
  const listLines = lines.slice(listStart);
  const isNumbered = isNumberedLine(listLines[0]);
  const allListed = listLines.every((l) => (isNumbered ? isNumberedLine(l) : isBulletLine(l)));

  if (!allListed) {
    // Mixed content the simple parser can't cleanly separate — render as
    // plain text rather than mangling it.
    return <p className="[&:not(:first-child)]:mt-1.5">{renderInline(block)}</p>;
  }

  const ListTag = isNumbered ? "ol" : "ul";
  const stripPattern = isNumbered ? /^\d+[.)]\s+/ : /^[-*]\s+/;

  return (
    <>
      {intro.length > 0 && (
        <p className="[&:not(:first-child)]:mt-1.5">{renderInline(intro.join(" "))}</p>
      )}
      <ListTag className={cn("my-1 space-y-0.5 pl-4", isNumbered ? "list-decimal" : "list-disc")}>
        {listLines.map((l, i) => (
          <li key={i}>{renderInline(l.trim().replace(stripPattern, ""))}</li>
        ))}
      </ListTag>
    </>
  );
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
