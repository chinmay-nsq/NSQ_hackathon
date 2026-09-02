"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Coins, ListChecks, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Adventure, DialogueAction } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { HoverLift } from "@/components/motion/HoverLift";
import { CountUp } from "@/components/motion/CountUp";
import { AnimatedBar } from "@/components/motion/AnimatedBar";
import { CompanionViewer } from "@/components/companion3d/CompanionViewer";
import { ensureDailyQuiz } from "@/lib/ensureDailyQuiz";
import { LightningBurst, type LightningBurstHandle } from "@/components/landing/LightningBurst";

const FALLBACK_DIALOGUE = "I'm here with you — let's see what today brings!";
const XP_PER_LEVEL = 100;

const DIALOGUE_ACTION_ROUTE: Record<DialogueAction["topic"], string> = {
  adventures: "/adventures",
  approvals: "/approvals",
  teams: "/teams",
};

/** Shared micro-label: the one place small-caps type is allowed to appear. */
const LABEL = "text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

/*
  One accent per stat, and always the same one: progress is blue, the coin
  economy is yellow, anything companion- or activity-flavoured is pink. The
  tints are the only colour on the row, so the numbers stay the loudest thing.
*/
const STAT_TONES = {
  blue: "bg-blue-soft text-primary",
  yellow: "bg-yellow-soft text-yellow-foreground",
  pink: "bg-pink-soft text-pink-foreground",
} as const;

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: keyof typeof STAT_TONES;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", STAT_TONES[tone])}>
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="tabular font-display text-2xl leading-none font-bold">
          <CountUp value={value} />
        </p>
        <p className={cn("mt-1.5", LABEL)}>{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { employee } = useAuthStore();
  const router = useRouter();
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [dialogueAction, setDialogueAction] = useState<DialogueAction | undefined>(undefined);
  const [dialogueLoading, setDialogueLoading] = useState(true);
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [adventuresLoading, setAdventuresLoading] = useState(true);
  const burstRef = useRef<LightningBurstHandle>(null);
  const stillLoading = dialogueLoading || adventuresLoading;

  // While this page's own data is still loading (companion dialogue +
  // today's adventures), a click anywhere strikes a real lightning bolt at
  // the click point instead of silently doing nothing on the skeletons.
  useEffect(() => {
    if (!stillLoading) return;
    function onClick(e: MouseEvent) {
      void burstRef.current?.fire(e.clientX, e.clientY, 120);
    }
    window.addEventListener("click", onClick, { capture: true });
    return () => window.removeEventListener("click", onClick, { capture: true });
  }, [stillLoading]);

  useEffect(() => {
    // Ensure today's quiz exists BEFORE asking the companion for a greeting
    // — otherwise the dialogue request can race ahead and describe "nothing
    // pending" right before the quiz silently appears a moment later.
    api
      .get<{ adventures: Adventure[] }>("/adventures/")
      .then((data) => ensureDailyQuiz(data.adventures))
      .catch(() => [] as Adventure[])
      .then((adventures) => {
        setAdventures(adventures);
        setAdventuresLoading(false);

        api
          .get<{ dialogue: string; action?: DialogueAction }>("/companion/dialogue")
          .then((data) => {
            setDialogue(data.dialogue);
            setDialogueAction(data.action);
          })
          .catch(() => setDialogue(FALLBACK_DIALOGUE))
          .finally(() => setDialogueLoading(false));
      });
  }, []);

  const pendingAdventures = adventures.filter((a) => !a.progress?.[0]?.completed && a.status === "ACTIVE");
  const level = employee?.level ?? 1;
  const xpIntoLevel = (employee?.xp ?? 0) % XP_PER_LEVEL;
  const tourQuestId =
    pendingAdventures.find((a) => a.quiz && a.quiz.length > 0)?.id ?? pendingAdventures[0]?.id;

  return (
    <PageIn>
      <PageHeader
        title={`Welcome back${employee ? `, ${employee.name.split(" ")[0]}` : ""}`}
        description="Here's what's happening with you and your team today."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden border border-border lg:col-span-2">
          {/* The companion is the app's one moment of character — a single
              soft pink wash marks it out without tinting the whole card. */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_75%_at_0%_0%,var(--pink-soft),transparent_70%)]" />
          <CardContent className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
            {employee?.companion && (
              <div className="mx-auto flex size-24 shrink-0 items-center justify-center rounded-2xl bg-pink-soft sm:mx-0">
                <CompanionViewer
                  species={employee.companion.species}
                  className="size-full"
                  interactive={false}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("mb-2.5 flex items-center gap-1.5", LABEL)}>
                <Sparkles className="size-3.5 text-pink" />
                Your companion
              </p>
              {dialogueLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <p className="text-[15px] leading-relaxed text-balance">{dialogue}</p>
                  {dialogueAction && (
                    <Button
                      size="sm"
                      className="group mt-4"
                      onClick={() => router.push(DIALOGUE_ACTION_ROUTE[dialogueAction.topic])}
                    >
                      {dialogueAction.label}
                      <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={LABEL}>Level</p>
                <p className="tabular font-display mt-1 text-3xl leading-none font-bold">{level}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 font-medium">
                {employee?.title ?? "Member"}
              </Badge>
            </div>
            <div className="space-y-2">
              <AnimatedBar pct={xpIntoLevel} className="h-1.5" fillClassName="bg-primary" />
              <div className="tabular flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {xpIntoLevel} / {XP_PER_LEVEL} XP
                </span>
                <span>{XP_PER_LEVEL - xpIntoLevel} to level {level + 1}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatTile icon={Zap} label="Total XP" value={employee?.xp ?? 0} tone="blue" />
        <StatTile icon={Coins} label="Coins" value={employee?.coins ?? 0} tone="yellow" />
        <StatTile icon={ListChecks} label="Pending" value={pendingAdventures.length} tone="pink" />
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold">Today&apos;s adventures</h2>
          <Button
            variant="ghost"
            size="sm"
            className="group text-muted-foreground"
            render={
              <Link href="/adventures">
                View all
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />
        </div>

        {adventuresLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : pendingAdventures.length === 0 ? (
          <Card className="border border-dashed border-border bg-transparent">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nothing queued up for today.{" "}
              <Link href="/adventures" className="font-medium text-primary underline-offset-2 hover:underline">
                Generate an adventure
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <StaggerGrid className="grid gap-4 sm:grid-cols-2" deps={[pendingAdventures.length]}>
            {pendingAdventures.slice(0, 4).map((a) => (
              <Link key={a.id} href={`/adventures/${a.id}`} data-tour={a.id === tourQuestId ? "quest-card" : undefined}>
                <HoverLift>
                  <Card className="h-full border border-border transition-colors hover:border-primary/40">
                    <CardContent className="p-5">
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <Badge variant="outline" className="text-[10px] tracking-[0.1em] uppercase">
                          {a.type.replace("_", " ")}
                        </Badge>
                        <span className="tabular rounded-md bg-blue-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                          +{a.xpReward} XP
                        </span>
                      </div>
                      <p className="font-medium">{a.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {a.description}
                      </p>
                    </CardContent>
                  </Card>
                </HoverLift>
              </Link>
            ))}
          </StaggerGrid>
        )}
      </div>

      <LightningBurst ref={burstRef} />
    </PageIn>
  );
}
