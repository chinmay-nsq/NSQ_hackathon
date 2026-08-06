"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Coins, Flame, Sparkles, Star, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Adventure } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { HoverLift } from "@/components/motion/HoverLift";
import { CountUp } from "@/components/motion/CountUp";
import { AnimatedBar } from "@/components/motion/AnimatedBar";
import { CompanionViewer } from "@/components/companion3d/CompanionViewer";

const FALLBACK_DIALOGUE = "I'm here with you — let's see what today brings!";
const XP_PER_LEVEL = 100;

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <HoverLift>
      <Card>
        <CardContent className="flex items-center gap-3 px-4">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted"
            style={accent ? { color: accent } : undefined}
          >
            <Icon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="tabular text-lg font-semibold leading-tight">
              <CountUp value={value} />
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </HoverLift>
  );
}

export default function DashboardPage() {
  const { employee } = useAuthStore();
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [dialogueLoading, setDialogueLoading] = useState(true);
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [adventuresLoading, setAdventuresLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ dialogue: string }>("/companion/dialogue")
      .then((data) => setDialogue(data.dialogue))
      .catch(() => setDialogue(FALLBACK_DIALOGUE))
      .finally(() => setDialogueLoading(false));
    api
      .get<{ adventures: Adventure[] }>("/adventures/")
      .then((data) => setAdventures(data.adventures))
      .catch(() => setAdventures([]))
      .finally(() => setAdventuresLoading(false));
  }, []);

  const pendingAdventures = adventures.filter((a) => !a.progress?.[0]?.completed && a.status === "ACTIVE");
  const xpIntoLevel = (employee?.xp ?? 0) % XP_PER_LEVEL;

  return (
    <PageIn>
      <PageHeader
        title={`Welcome back${employee ? `, ${employee.name.split(" ")[0]}` : ""}`}
        description="Here's what's happening with you and your team today."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4" />
              Your companion
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4 px-4">
            {employee?.companion && (
              <CompanionViewer
                species={employee.companion.species}
                className="h-24 w-24 shrink-0"
                interactive={false}
              />
            )}
            <div className="flex-1">
              {dialogueLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{dialogue}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 px-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Level {employee?.level ?? 1}</span>
              <span className="tabular text-xs text-muted-foreground">
                {xpIntoLevel} / {XP_PER_LEVEL} XP
              </span>
            </div>
            <AnimatedBar pct={xpIntoLevel} fillClassName="bg-xp" />
            <Badge variant="secondary" className="w-fit">
              {employee?.title ?? "Member"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile icon={Star} label="Total XP" value={employee?.xp ?? 0} />
        <StatTile icon={Coins} label="Coins" value={employee?.coins ?? 0} accent="var(--currency)" />
        <StatTile icon={Flame} label="Pending Adventures" value={pendingAdventures.length} />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Today&apos;s Adventures</h2>
          <Button
            variant="ghost"
            size="sm"
            render={
              <Link href="/adventures">
                View all
                <ArrowRight />
              </Link>
            }
          />
        </div>

        {adventuresLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : pendingAdventures.length === 0 ? (
          <Card>
            <CardContent className="px-4 py-6 text-center text-sm text-muted-foreground">
              No adventures yet today.{" "}
              <Link href="/adventures" className="text-primary underline-offset-2 hover:underline">
                Generate one
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <StaggerGrid className="grid gap-3 sm:grid-cols-2" deps={[pendingAdventures.length]}>
            {pendingAdventures.slice(0, 4).map((a) => (
              <Link key={a.id} href={`/adventures/${a.id}`}>
                <HoverLift>
                  <Card>
                    <CardContent className="px-4">
                      <div className="mb-1 flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {a.type.replace("_", " ")}
                        </Badge>
                        <span className="tabular text-xs text-muted-foreground">+{a.xpReward} XP</span>
                      </div>
                      <p className="font-medium">{a.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                    </CardContent>
                  </Card>
                </HoverLift>
              </Link>
            ))}
          </StaggerGrid>
        )}
      </div>
    </PageIn>
  );
}
