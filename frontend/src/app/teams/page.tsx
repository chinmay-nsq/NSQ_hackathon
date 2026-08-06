"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Guild } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { HoverLift } from "@/components/motion/HoverLift";

export default function TeamsPage() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ guilds: Guild[] }>("/guilds/")
      .then((data) => setGuilds(data.guilds))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load teams"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageIn>
      <PageHeader title="Teams" description="Every department has its own team, resources, and roster." />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <StaggerGrid className="grid gap-4 md:grid-cols-2" deps={[guilds.length]}>
          {guilds.map((guild) => (
            <Link key={guild.id} href={`/teams/${guild.id}`}>
              <HoverLift>
                <Card>
                  <CardContent className="px-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback>{guild.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-medium">{guild.name}</p>
                          <Badge variant="secondary" className="shrink-0">
                            Lvl {guild.level}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{guild.department}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        {guild.members.length} members
                      </span>
                      <span className="tabular">{guild.reputation} reputation</span>
                    </div>
                  </CardContent>
                </Card>
              </HoverLift>
            </Link>
          ))}
        </StaggerGrid>
      )}
    </PageIn>
  );
}
