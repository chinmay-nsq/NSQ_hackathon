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
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 size-3.5" />
        Back to teams
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback className="text-lg">{guild.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {guild.department}
            </p>
            <h1 className="text-xl font-semibold tracking-tight">{guild.name}</h1>
          </div>
        </div>
        {!isMember && (
          <Button onClick={handleJoin} disabled={joining}>
            {joining ? "Joining…" : "Join team"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Team Level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4">
            <p className="tabular text-2xl font-semibold">{guild.level}</p>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reputation</span>
              <span className="tabular">{guild.reputation}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Resources</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-3">
              {RESOURCES.map((r) => (
                <div key={r} className="rounded-md border px-3 py-2">
                  <p className="text-xs text-muted-foreground">{RESOURCE_LABEL[r]}</p>
                  <p className="tabular text-lg font-semibold">
                    <CountUp value={guild[r]} />
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Members ({guild.members.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {guild.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="divide-y">
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
