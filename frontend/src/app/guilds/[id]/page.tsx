"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { api, ApiRequestError } from "@/lib/api";
import { Guild } from "@/lib/types";
import { Card } from "@/components/Card";
import { GuildSeal } from "@/components/GuildSeal";

const RESOURCE_META: Record<string, { label: string; color: string }> = {
  knowledge: { label: "Knowledge", color: "var(--fg-muted)" },
  gold: { label: "Gold", color: "var(--value)" },
  influence: { label: "Influence", color: "var(--accent)" },
  materials: { label: "Materials", color: "var(--success)" },
};

const RESOURCES = ["knowledge", "gold", "influence", "materials"] as const;

export default function GuildDetailPage() {
  const params = useParams<{ id: string }>();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ guild: Guild }>(`/guilds/${params.id}`)
      .then((data) => setGuild(data.guild))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load guild"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="text-fg-muted text-sm">Reading the charter…</p>;
  if (error) return <p className="text-accent text-sm">{error}</p>;
  if (!guild) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Link href="/guilds" className="label-caps text-[11px] text-fg-muted hover:text-accent transition-colors">
        ← All Guilds
      </Link>

      <div className="flex items-center gap-4 mt-4 pb-6 mb-8 border-b border-line">
        <GuildSeal emblem={guild.emblem} name={guild.name} size={52} />
        <div>
          <p className="label-caps text-xs text-accent mb-1">{guild.department}</p>
          <h1 className="font-display text-3xl leading-tight">{guild.name}</h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1" eyebrow="Sworn Guardian" title={guild.guardianName}>
          <p className="text-sm text-fg-muted capitalize">
            {guild.guardianSpecies} · Level {guild.guardianLevel}
          </p>
          <div className="mt-5 pt-4 border-t border-line space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-fg-muted">Guild Level</span>
              <span className="tabular text-value">{guild.level}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-fg-muted">Reputation</span>
              <span className="tabular">{guild.reputation}</span>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2" eyebrow="Treasury" title="Resources on Hand">
          <div className="grid grid-cols-2 gap-3">
            {RESOURCES.map((r) => {
              const meta = RESOURCE_META[r];
              return (
                <div key={r} className="border border-line rounded-sm px-4 py-3">
                  <div className="label-caps text-[10px] text-fg-muted">{meta.label}</div>
                  <div className="tabular text-2xl mt-1" style={{ color: meta.color }}>
                    {guild[r]}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card eyebrow="Roster" title={`Members (${guild.members.length})`}>
          {guild.members.length === 0 ? (
            <p className="text-fg-muted text-sm">No members have sworn in yet.</p>
          ) : (
            <div className="divide-y divide-line -my-1">
              {guild.members.map((m) => (
                <div key={m.id} className="flex justify-between py-3 text-sm">
                  <span>{m.name}</span>
                  <span className="text-fg-muted">
                    {m.title} <span className="tabular text-value ml-1">Lvl {m.level}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
