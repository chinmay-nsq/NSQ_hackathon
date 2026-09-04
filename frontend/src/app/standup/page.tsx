"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Users2, ArrowRightLeft } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { StandupMessage, StandupRoom } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { renderMiniMarkdown } from "@/lib/miniMarkdown";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageIn } from "@/components/motion/PageIn";

/** How often to pull new messages while the tab is actually being looked at. */
const POLL_MS = 5000;
/** Consecutive messages from one person inside this window share a header. */
const GROUP_WINDOW_MS = 4 * 60 * 1000;

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/** Who is speaking, and when. */
function SenderLine({ message, mine }: { message: StandupMessage; mine: boolean }) {
  return (
    <div className={cn("mb-1 flex items-center gap-1.5 px-1", mine && "flex-row-reverse")}>
      <span className="text-xs font-semibold">{mine ? "You" : message.author.name}</span>
      <span className="text-[10px] text-muted-foreground">{formatTime(message.createdAt)}</span>
    </div>
  );
}

/**
 * One bubble in the room.
 *
 * Typed messages and task movements share this shape on purpose — the server
 * writes movements as first-person lines ("Hi team, X is up for review"), so
 * they belong in the conversation rather than in a log underneath it. The
 * tint is the only thing that separates them, and a movement links back to
 * its card so it stays recognisable as something that actually happened.
 */
function MessageBubble({
  message,
  mine,
  showHeader,
}: {
  message: StandupMessage;
  mine: boolean;
  showHeader: boolean;
}) {
  const isEvent = message.kind === "EVENT";

  const bubble = (
    <div
      className={cn(
        "w-fit max-w-full rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
        isEvent
          ? "border border-primary/25 bg-accent/60 text-foreground"
          : mine
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        // The flat corner points back at the speaker — only on the first
        // bubble of a run, so a group still reads as one turn.
        showHeader && (mine ? "rounded-tr-sm" : "rounded-tl-sm"),
        isEvent && message.assignmentId && "transition-colors hover:border-primary/60 hover:bg-accent"
      )}
    >
      {isEvent ? (
        <>
          <span className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] text-accent-foreground uppercase">
            <ArrowRightLeft className="size-3" />
            Task update
          </span>
          {renderMiniMarkdown(message.body)}
        </>
      ) : (
        <span className="whitespace-pre-wrap">{message.body}</span>
      )}
    </div>
  );

  return (
    <div className={cn("flex gap-2.5", mine && "flex-row-reverse", showHeader ? "mt-4" : "mt-1")}>
      {/* Kept open even when the avatar is hidden, so a grouped run stays
          lined up with the bubble above it. */}
      {!mine && (
        <div className="w-8 shrink-0">
          {showHeader && (
            <Avatar className="size-8">
              <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
                {initials(message.author.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn("flex min-w-0 max-w-[80%] flex-col", mine && "items-end")}>
        {showHeader && <SenderLine message={message} mine={mine} />}
        {isEvent && message.assignmentId ? (
          <Link
            href={`/assignments/${message.assignmentId}`}
            className="max-w-full rounded-2xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {bubble}
          </Link>
        ) : (
          bubble
        )}
      </div>
    </div>
  );
}

/**
 * One room's live timeline.
 *
 * Mounted with `key={room.id}` by the page, so switching rooms remounts this
 * with fresh state instead of clearing it — which is what keeps the polling
 * of an old room from ever landing in a new one.
 */
function RoomChat({ room }: { room: StandupRoom }) {
  const viewerId = useAuthStore((s) => s.employee?.id);
  const [messages, setMessages] = useState<StandupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  // Only auto-scroll when the reader is already at the bottom — yanking the
  // view down while someone reads scrollback is worse than missing a message.
  const pinnedRef = useRef(true);
  const lastIdRef = useRef<string | null>(null);

  const merge = useCallback((incoming: StandupMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const seen = new Set(current.map((m) => m.id));
      const added = incoming.filter((m) => !seen.has(m.id));
      if (added.length === 0) return current;
      const next = [...current, ...added];
      lastIdRef.current = next[next.length - 1].id;
      return next;
    });
  }, []);

  // Load the room, then catch up from the last message we hold. Anchoring on
  // that id (rather than a timestamp) is what stops a message posted between
  // two polls from being skipped.
  useEffect(() => {
    let cancelled = false;

    async function poll(initial: boolean) {
      if (cancelled) return;
      if (!initial && document.hidden) return;
      try {
        const after = lastIdRef.current;
        const query = after
          ? `?teamId=${room.id}&after=${encodeURIComponent(after)}`
          : `?teamId=${room.id}`;
        const data = await api.get<{ messages: StandupMessage[] }>(`/standup/messages${query}`);
        if (cancelled) return;
        if (initial) {
          setMessages(data.messages);
          lastIdRef.current = data.messages[data.messages.length - 1]?.id ?? null;
        } else {
          merge(data.messages);
        }
        setError(null);
      } catch {
        // A dropped poll is not worth an error banner — the next one recovers.
        if (initial && !cancelled) setError("Could not load this room.");
      } finally {
        if (initial && !cancelled) setLoading(false);
      }
    }

    void poll(true);
    const interval = setInterval(() => void poll(false), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [room.id, merge]);

  // Runs before paint, so the list is never seen scrolled to the wrong place.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    try {
      const data = await api.post<{ message: StandupMessage }>("/standup/messages", {
        teamId: room.id,
        body,
      });
      setDraft("");
      pinnedRef.current = true;
      merge([data.message]);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not send that message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="flex h-[calc(100vh-16rem)] min-h-96 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            // 48px of slack, so "basically at the bottom" still counts.
            pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          }}
          className="flex-1 overflow-y-auto px-4 py-3"
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-2/3 rounded-2xl" />
              <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
              <Skeleton className="h-14 w-3/4 rounded-2xl" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <Users2 className="size-7 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm font-medium">{room.name} is quiet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Say something, or move a task on the board — both show up here.
              </p>
            </div>
          ) : (
            messages.map((message, i) => {
              const previous = messages[i - 1];
              const newDay =
                !previous ||
                new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
              const showHeader =
                newDay ||
                !previous ||
                previous.kind !== message.kind ||
                previous.author.id !== message.author.id ||
                new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() > GROUP_WINDOW_MS;

              return (
                <div key={message.id}>
                  {newDay && (
                    <div className="my-3 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        {formatDay(message.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    mine={message.author.id === viewerId}
                    showHeader={showHeader}
                  />
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${room.name}…`}
            maxLength={2000}
            className="h-9 flex-1 rounded-full border border-border bg-background px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button type="submit" size="icon-sm" disabled={!draft.trim() || sending} className="rounded-full">
            <Send className="size-3.5" />
          </Button>
        </form>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Task moves post here automatically — drag a card on the board to see one appear.
      </p>
    </>
  );
}

/**
 * The team standup room — one per team. Real conversation and real task
 * movement share a single timeline, so "what changed" and "what we said
 * about it" sit next to each other instead of in two places.
 *
 * Event lines are written server-side at the moment a task actually moves
 * (see StandupService.postTaskEvent), so this is a record of what happened,
 * never a generated recap.
 */
export default function StandupPage() {
  const [rooms, setRooms] = useState<StandupRoom[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ rooms: StandupRoom[] }>("/standup/rooms")
      .then((data) => {
        setRooms(data.rooms);
        setRoomId(data.rooms[0]?.id ?? null);
      })
      .catch(() => setError("Could not load your standup."))
      .finally(() => setLoading(false));
  }, []);

  const activeRoom = rooms.find((r) => r.id === roomId);

  return (
    <PageIn>
      <PageHeader
        title="Standup"
        description="Your team's room — what people say and what actually moved, in one timeline."
        action={
          rooms.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {rooms.map((r) => (
                <Button
                  key={r.id}
                  size="sm"
                  variant={r.id === roomId ? "default" : "outline"}
                  onClick={() => setRoomId(r.id)}
                >
                  {r.name}
                </Button>
              ))}
            </div>
          ) : undefined
        }
      />

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {loading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : activeRoom ? (
        <RoomChat key={activeRoom.id} room={activeRoom} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
          <Users2 className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-medium">No team room yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Standup rooms belong to a team — once you join one, its room shows up here.
          </p>
        </div>
      )}
    </PageIn>
  );
}
