"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, type LucideIcon } from "lucide-react";
import { Sparkles, ClipboardList, Swords, Users, Store, ShieldPlus, Link2, UserPlus } from "lucide-react";
import { Employee, Adventure, Guild, AssignedTask, PendingApproval } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedBar } from "@/components/motion/AnimatedBar";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { cn } from "@/lib/utils";

const DISMISS_KEY_EMPLOYEE = "weatherline_getting_started_dismissed";
const DISMISS_KEY_LEAD = "weatherline_getting_started_dismissed_lead";

interface JourneyStep<T> {
  key: string;
  icon: LucideIcon;
  label: string;
  href: string;
  done: (ctx: T) => boolean;
}

interface EmployeeCtx {
  employee: Employee;
  adventures: Adventure[];
}

const EMPLOYEE_STEPS: JourneyStep<EmployeeCtx>[] = [
  {
    key: "companion",
    icon: Sparkles,
    label: "Choose your companion",
    href: "/onboarding",
    done: ({ employee }) => Boolean(employee.companion),
  },
  {
    key: "profile",
    icon: ClipboardList,
    label: "Complete your profile",
    href: "/onboarding/profile",
    done: ({ employee }) => Boolean(employee.profileCompletedAt),
  },
  {
    key: "quest",
    icon: Swords,
    label: "Finish your first quest",
    href: "/adventures",
    done: ({ adventures }) => adventures.some((a) => a.progress?.[0]?.completed),
  },
  {
    key: "team",
    icon: Users,
    label: "Join or create a team",
    href: "/teams",
    done: ({ employee }) => Boolean(employee.guildId),
  },
  {
    key: "rewards",
    icon: Store,
    label: "Browse the rewards marketplace",
    href: "/rewards",
    done: ({ employee }) => employee.coins > 0,
  },
];

interface LeadCtx {
  employee: Employee;
  managedGuilds: Guild[];
  assignedTasks: AssignedTask[];
  pendingApprovals: PendingApproval[];
}

const LEAD_STEPS: JourneyStep<LeadCtx>[] = [
  {
    key: "profile",
    icon: ClipboardList,
    label: "Complete your profile",
    href: "/onboarding/profile",
    done: ({ employee }) => Boolean(employee.profileCompletedAt),
  },
  {
    key: "team",
    icon: ShieldPlus,
    label: "Create your team",
    href: "/teams",
    done: ({ managedGuilds }) => managedGuilds.length > 0,
  },
  {
    key: "invite",
    icon: Link2,
    label: "Invite your first member",
    href: "/teams",
    done: ({ managedGuilds }) => managedGuilds.some((g) => g.members.length > 0),
  },
  {
    key: "assign",
    icon: UserPlus,
    label: "Assign your first task",
    href: "/adventures",
    done: ({ assignedTasks, pendingApprovals }) => assignedTasks.length > 0 || pendingApprovals.length > 0,
  },
];

function JourneyCard<T>({
  title,
  steps,
  ctx,
  dismissKey,
}: {
  title: string;
  steps: JourneyStep<T>[];
  ctx: T;
  dismissKey: string;
}) {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(dismissKey) === "true"
  );

  const results = steps.map((step) => ({ step, done: step.done(ctx) }));
  const doneCount = results.filter((r) => r.done).length;
  const allDone = doneCount === steps.length;

  if (dismissed || allDone) return null;

  function dismiss() {
    window.localStorage.setItem(dismissKey, "true");
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
          <h2 className="font-display text-lg tracking-wide uppercase">{title}</h2>
          <span className="tabular font-mono text-xs text-muted-foreground">
            {doneCount} / {steps.length}
          </span>
        </div>
        <AnimatedBar pct={(doneCount / steps.length) * 100} className="mb-5" fillClassName="bg-primary" />

        <StaggerGrid className="grid gap-2 sm:grid-cols-2" deps={[doneCount]}>
          {results.map(({ step, done }) => (
            <Link
              key={step.key}
              href={step.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors",
                done ? "border-transparent text-muted-foreground" : "border-border hover:bg-muted/50"
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

/**
 * Role-aware onboarding checklist: an employee sees the "join → companion →
 * profile → quest → rewards" path, a manager/admin sees the lead-specific
 * path ("create team → invite → assign a task") since they never join a
 * team or browse the marketplace as their first action.
 */
export function GettingStarted({
  employee,
  adventures,
  managedGuilds,
  assignedTasks,
  pendingApprovals,
}: {
  employee: Employee;
  adventures: Adventure[];
  managedGuilds: Guild[];
  assignedTasks: AssignedTask[];
  pendingApprovals: PendingApproval[];
}) {
  const isLead = employee.role === "MANAGER" || employee.role === "ADMIN";

  if (isLead) {
    return (
      <JourneyCard
        title="Getting Started"
        steps={LEAD_STEPS}
        ctx={{ employee, managedGuilds, assignedTasks, pendingApprovals }}
        dismissKey={DISMISS_KEY_LEAD}
      />
    );
  }

  return (
    <JourneyCard
      title="Getting Started"
      steps={EMPLOYEE_STEPS}
      ctx={{ employee, adventures }}
      dismissKey={DISMISS_KEY_EMPLOYEE}
    />
  );
}
