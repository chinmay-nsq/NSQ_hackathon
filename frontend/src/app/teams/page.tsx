"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, UsersRound, BarChart3 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Guild, TeamMemberGrowth } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { useOnboardingTourStore } from "@/store/onboardingTourStore";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { CreateGuildDialog } from "@/components/guilds/CreateGuildDialog";
import { TeamMemberPerformanceCard } from "@/components/teams/TeamMemberPerformanceCard";
import { TeamMemberDetailDialog } from "@/components/teams/TeamMemberDetailDialog";

export default function TeamsPage() {
  const { employee } = useAuthStore();
  const canCreateGuild = employee?.role === "MANAGER" || employee?.role === "ADMIN";
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMemberGrowth[]>([]);
  const [membersLoading, setMembersLoading] = useState(canCreateGuild);
  const [detailMember, setDetailMember] = useState<TeamMemberGrowth | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(() => {
    return api
      .get<{ guilds: Guild[] }>("/guilds/")
      .then((data) => setGuilds(data.guilds))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load teams"))
      .finally(() => setLoading(false));
  }, []);

  const loadMembers = useCallback(() => {
    if (!canCreateGuild) return Promise.resolve();
    return api
      .get<{ members: TeamMemberGrowth[] }>("/growth/team-members")
      .then((data) => setMembers(data.members))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [canCreateGuild]);

  function handleGuildCreated() {
    useOnboardingTourStore.getState().signalAction("create-team");
    void load();
    void loadMembers();
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  return (
    <PageIn>
      <PageHeader
        title="Teams"
        description={
          canCreateGuild
            ? "Teams you lead, with their resources and roster."
            : "Your team, its resources, and its roster."
        }
        action={canCreateGuild ? <CreateGuildDialog onCreated={handleGuildCreated} /> : undefined}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {canCreateGuild && (
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="size-4.5 text-muted-foreground" />
            <h2 className="font-display text-xl tracking-wide uppercase">Team performance</h2>
          </div>
          {membersLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No team members yet — invite someone to see their performance here.
            </div>
          ) : (
            <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" deps={[members.length]}>
              {members.map((m) => (
                <TeamMemberPerformanceCard
                  key={m.employeeId}
                  member={m}
                  onOpenDetail={(selected) => {
                    setDetailMember(selected);
                    setDetailOpen(true);
                  }}
                />
              ))}
            </StaggerGrid>
          )}
        </div>
      )}

      {canCreateGuild && !loading && guilds.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Users className="size-4.5 text-muted-foreground" />
          <h2 className="font-display text-xl tracking-wide uppercase">Your teams</h2>
        </div>
      )}

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

      <TeamMemberDetailDialog member={detailMember} open={detailOpen} onOpenChange={setDetailOpen} />
    </PageIn>
  );
}
