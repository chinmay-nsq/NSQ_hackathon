"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, UsersRound, BarChart3 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Team, TeamMemberGrowth } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { useOnboardingTourStore } from "@/store/onboardingTourStore";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { TeamMemberPerformanceCard } from "@/components/teams/TeamMemberPerformanceCard";
import { TeamMemberDetailDialog } from "@/components/teams/TeamMemberDetailDialog";

export default function TeamsPage() {
  const { employee } = useAuthStore();
  const canCreateTeam = employee?.role === "MANAGER" || employee?.role === "ADMIN";
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMemberGrowth[]>([]);
  const [membersLoading, setMembersLoading] = useState(canCreateTeam);
  const [detailMember, setDetailMember] = useState<TeamMemberGrowth | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(() => {
    return api
      .get<{ teams: Team[] }>("/teams/")
      .then((data) => setTeams(data.teams))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load teams"))
      .finally(() => setLoading(false));
  }, []);

  const loadMembers = useCallback(() => {
    if (!canCreateTeam) return Promise.resolve();
    return api
      .get<{ members: TeamMemberGrowth[] }>("/growth/team-members")
      .then((data) => setMembers(data.members))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [canCreateTeam]);

  function handleTeamCreated() {
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
          canCreateTeam
            ? "Teams you lead, with their resources and roster."
            : "Your team, its resources, and its roster."
        }
        action={canCreateTeam ? <CreateTeamDialog onCreated={handleTeamCreated} /> : undefined}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {canCreateTeam && (
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

      {canCreateTeam && !loading && teams.length > 0 && (
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
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
          <UsersRound className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-medium">You haven&apos;t joined a team yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ask your team lead for an invite link to get started.
          </p>
        </div>
      ) : (
        <StaggerGrid className="divide-y divide-border/60 border-t border-border/60" deps={[teams.length]}>
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="group/row flex items-center gap-4 py-4 transition-colors hover:bg-muted/40"
            >
              <Avatar className="glow-primary size-11 shrink-0 ring-1 ring-primary/20">
                <AvatarFallback className="font-display bg-accent text-accent-foreground">
                  {team.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate font-medium transition-colors group-hover/row:text-primary">
                    {team.name}
                  </p>
                  <Badge variant="secondary" className="shrink-0 font-mono text-[10px] tracking-wide uppercase">
                    Lvl {team.level}
                  </Badge>
                </div>
                <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  {team.department}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {team.members.length}
                </span>
                <span className="tabular text-primary">{team.reputation} rep</span>
              </div>
            </Link>
          ))}
        </StaggerGrid>
      )}

      <TeamMemberDetailDialog member={detailMember} open={detailOpen} onOpenChange={setDetailOpen} />
    </PageIn>
  );
}
