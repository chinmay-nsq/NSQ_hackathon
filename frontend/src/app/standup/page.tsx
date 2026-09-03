"use client";

import { useEffect, useState } from "react";
import { Users2, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { StandupPerson } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * "Who completed what" — a real feed of real task submissions over the
 * last week, grouped by person. Every line here is a real SUBMITTED
 * activity-log entry (see TaskActivityService.standupFor), never a summary
 * or invented recap — just the actual real work, attributed to whoever
 * actually did it.
 */
export default function StandupPage() {
  const [people, setPeople] = useState<StandupPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ people: StandupPerson[] }>("/standup/")
      .then((data) => setPeople(data.people))
      .catch(() => setError("Could not load standup."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageIn>
      <PageHeader
        title="Standup"
        description="Who completed what, this week — a real feed, not a summary."
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : people.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
          <Users2 className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-medium">Nothing submitted this week yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Once someone submits a task, it shows up here.
          </p>
        </div>
      ) : (
        <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" deps={[people.length]}>
          {people.map((person) => (
            <Card key={person.employeeId} className="border-0">
              <CardContent className="px-5 py-4">
                <div className="mb-3 flex items-center gap-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="font-display bg-accent text-accent-foreground">
                      {initials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{person.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{person.title}</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {person.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                      <span className="min-w-0 flex-1">
                        {item.adventureTitle}
                        <span className="ml-1.5 text-xs text-muted-foreground">{formatWhen(item.at)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </StaggerGrid>
      )}
    </PageIn>
  );
}
