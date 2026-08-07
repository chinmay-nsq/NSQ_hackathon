"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { Guild } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageIn } from "@/components/motion/PageIn";
import { CountUp } from "@/components/motion/CountUp";

const RESOURCE_LABEL: Record<string, string> = {
  knowledge: "Knowledge",
  gold: "Gold",
  influence: "Influence",
  materials: "Materials",
};

const RESOURCES = ["knowledge", "gold", "influence", "materials"] as const;

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { employee, fetchMe } = useAuthStore();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ guild: Guild }>(`/guilds/${params.id}`)
      .then((data) => setGuild(data.guild))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load team"))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleJoin() {
    if (!guild) return;
    setJoining(true);
    try {
      await api.post(`/guilds/${guild.id}/join`);
      await fetchMe();
      toast.success(`You joined ${guild.name}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not join this team.");
    } finally {
      setJoining(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading team…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!guild) return null;

  const isMember = employee?.guildId === guild.id;

  return (
    <PageIn>
      <Link
        href="/teams"
        className="mb-4 inline-flex items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
      >
        <ArrowLeft className="mr-1 size-3.5" />
        Back to teams
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="glow-primary size-13 ring-1 ring-primary/20">
            <AvatarFallback className="font-display bg-accent text-lg text-accent-foreground">
              {guild.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-mono text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {guild.department}
            </p>
            <h1 className="font-display text-2xl tracking-wide uppercase">{guild.name}</h1>
          </div>
        </div>
        {!isMember && (
          <Button onClick={handleJoin} disabled={joining} className="glow-primary font-mono text-xs tracking-wide uppercase">
            {joining ? "Joining…" : "Join team"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 md:col-span-1">
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Team Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4">
            <p className="tabular font-display text-3xl">{guild.level}</p>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reputation</span>
              <span className="tabular text-primary">{guild.reputation}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 md:col-span-2">
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-3">
              {RESOURCES.map((r) => (
                <div key={r} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                  <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                    {RESOURCE_LABEL[r]}
                  </p>
                  <p className="tabular font-display text-xl">
                    <CountUp value={guild[r]} />
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 border-0">
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Members ({guild.members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {guild.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {guild.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{m.name}</span>
                  <span className="text-muted-foreground">
                    {m.title} <span className="tabular ml-1">Lvl {m.level}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageIn>
  );
}
