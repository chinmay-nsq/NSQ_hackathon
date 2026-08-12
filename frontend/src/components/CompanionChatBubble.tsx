"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { ChatMessage } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { renderMiniMarkdown } from "@/lib/miniMarkdown";
import { CompanionViewer } from "@/components/companion3d/CompanionViewer";
import { Button } from "@/components/ui/button";

/**
 * Floating chat bubble, always reachable — the companion's real two-way
 * conversation surface, distinct from the one-shot dashboard greeting.
 * Only renders once the employee has a companion (chat needs one to exist
 * server-side anyway).
 */
export function CompanionChatBubble() {
  const { employee } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    api
      .get<{ messages: ChatMessage[] }>("/companion/chat")
      .then((data) => setMessages(data.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoaded(true));
  }, [open, loaded]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setError(null);
    setDraft("");
    // Optimistic: show the user's own message immediately, before the
    // round trip — the companion's reply lands separately once it arrives.
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      companionId: "",
      role: "USER",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const data = await api.post<{ message: ChatMessage; navigateTo: string | null }>("/companion/chat", {
        content,
      });
      setMessages((prev) => [...prev, data.message]);
      // A short delay so the employee actually sees the companion's reply
      // land before the page changes out from under them.
      if (data.navigateTo) {
        setTimeout(() => router.push(data.navigateTo!), 600);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't send that — try again.");
    } finally {
      setSending(false);
    }
  }

  if (!employee?.companion) return null;

  return (
    <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[28rem] w-80 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
            <CompanionViewer species={employee.companion.species} className="size-8 shrink-0" interactive={false} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{employee.companion.name}</p>
              <p className="truncate font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                {employee.companion.species}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {!loaded ? (
              <p className="text-center text-xs text-muted-foreground">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                Say hi to {employee.companion.name} — ask about your progress, your guild, anything.
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "USER" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      m.role === "USER"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted"
                    )}
                  >
                    {m.role === "COMPANION" ? renderMiniMarkdown(m.content) : m.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && <p className="px-4 pb-1 text-xs text-destructive">{error}</p>}

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border/60 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message your companion…"
              maxLength={1000}
              className="h-9 flex-1 rounded-full border border-border bg-background px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <Button type="submit" size="icon-sm" disabled={!draft.trim() || sending} className="glow-primary rounded-full">
              <Send className="size-3.5" />
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close companion chat" : "Chat with your companion"}
        className="glow-primary-strong flex size-14 items-center justify-center overflow-hidden rounded-full border border-border bg-card shadow-lg transition-transform hover:scale-105"
      >
        {open ? (
          <X className="size-5 text-muted-foreground" />
        ) : (
          <CompanionViewer species={employee.companion.species} className="size-full" interactive={false} />
        )}
      </button>
    </div>
  );
}
