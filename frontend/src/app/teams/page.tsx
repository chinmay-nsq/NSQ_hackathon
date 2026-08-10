"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, UsersRound } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Guild } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { CreateGuildDialog } from "@/components/guilds/CreateGuildDialog";

export default function TeamsPage() {
  const { employee } = useAuthStore();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return api
      .get<{ guilds: Guild[] }>("/guilds/")
      .then((data) => setGuilds(data.guilds))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load teams"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canCreateGuild = employee?.role === "MANAGER" || employee?.role === "ADMIN";

  return (
    <PageIn>
      <PageHeader
        title="Teams"
        description={
          canCreateGuild
            ? "Teams you lead, with their resources and roster."
            : "Your team, its resources, and its roster."
        }
        action={canCreateGuild ? <CreateGuildDialog onCreated={load} /> : undefined}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-px">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : guilds.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
          <UsersRound className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-medium">You haven&apos;t joined a team yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ask your team lead for an invite link to get started.
          </p>
        </div>
      ) : (
        <StaggerGrid className="divide-y divide-border/60 border-t border-border/60" deps={[guilds.length]}>
          {guilds.map((guild) => (
            <Link
              key={guild.id}
              href={`/teams/${guild.id}`}
              className="group/row flex items-center gap-4 py-4 transition-colors hover:bg-muted/40"
            >
              <Avatar className="glow-primary size-11 shrink-0 ring-1 ring-primary/20">
                <AvatarFallback className="font-display bg-accent text-accent-foreground">
                  {guild.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate font-medium transition-colors group-hover/row:text-primary">
                    {guild.name}
                  </p>
                  <Badge variant="secondary" className="shrink-0 font-mono text-[10px] tracking-wide uppercase">
                    Lvl {guild.level}
                  </Badge>
                </div>
                <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  {guild.department}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {guild.members.length}
                </span>
                <span className="tabular text-primary">{guild.reputation} rep</span>
              </div>
            </Link>
          ))}
        </StaggerGrid>
      )}
    </PageIn>
  );
}
