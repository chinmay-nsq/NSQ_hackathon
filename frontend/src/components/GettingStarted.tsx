"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, type LucideIcon } from "lucide-react";
import { Sparkles, ClipboardList, Swords, Users, Store } from "lucide-react";
import { Employee, Adventure } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedBar } from "@/components/motion/AnimatedBar";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "weatherline_getting_started_dismissed";

interface JourneyStep {
  key: string;
  icon: LucideIcon;
  label: string;
  href: string;
  done: (employee: Employee, adventures: Adventure[]) => boolean;
}

const STEPS: JourneyStep[] = [
  {
    key: "companion",
    icon: Sparkles,
    label: "Choose your companion",
    href: "/onboarding",
    done: (e) => Boolean(e.companion),
  },
  {
    key: "profile",
    icon: ClipboardList,
    label: "Complete your profile",
    href: "/onboarding/profile",
    done: (e) => Boolean(e.profileCompletedAt),
  },
  {
    key: "quest",
    icon: Swords,
    label: "Finish your first quest",
    href: "/adventures",
    done: (_e, adventures) => adventures.some((a) => a.progress?.[0]?.completed),
  },
  {
    key: "team",
    icon: Users,
    label: "Join or create a team",
    href: "/teams",
    done: (e) => Boolean(e.guildId),
  },
  {
    key: "rewards",
    icon: Store,
    label: "Browse the rewards marketplace",
    href: "/rewards",
    done: (e) => e.coins > 0,
  },
];

export function GettingStarted({ employee, adventures }: { employee: Employee; adventures: Adventure[] }) {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(DISMISS_KEY) === "true"
  );

  const results = STEPS.map((step) => ({ step, done: step.done(employee, adventures) }));
  const doneCount = results.filter((r) => r.done).length;
  const allDone = doneCount === STEPS.length;

  if (dismissed || allDone) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  return (
    <Card className="relative mb-6 border-0">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss getting started"
        className="absolute top-4 right-4 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <CardContent className="px-6">
        <div className="mb-1 flex items-center justify-between pr-6">
          <h2 className="font-display text-lg tracking-wide uppercase">Getting Started</h2>
          <span className="tabular font-mono text-xs text-muted-foreground">
            {doneCount} / {STEPS.length}
          </span>
        </div>
        <AnimatedBar pct={(doneCount / STEPS.length) * 100} className="mb-5" fillClassName="bg-primary" />

        <StaggerGrid className="grid gap-2 sm:grid-cols-2" deps={[doneCount]}>
          {results.map(({ step, done }) => (
            <Link
              key={step.key}
              href={step.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors",
                done
                  ? "border-transparent text-muted-foreground"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                )}
              >
                {done ? <Check className="size-3.5" /> : <step.icon className="size-3.5" />}
              </span>
              <span className={done ? "line-through decoration-muted-foreground/50" : ""}>{step.label}</span>
            </Link>
          ))}
        </StaggerGrid>
      </CardContent>
    </Card>
  );
}
