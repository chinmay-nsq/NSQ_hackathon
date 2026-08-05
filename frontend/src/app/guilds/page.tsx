"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, ApiRequestError } from "@/lib/api";
import { Guild } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { GuildSeal } from "@/components/GuildSeal";

export default function GuildsPage() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ guilds: Guild[] }>("/guilds/")
      .then((data) => setGuilds(data.guilds))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load guilds"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="The Realms"
        title="Guilds"
        description="Every department stands as a guild, sworn to a guardian and its own store of resources."
      />

      {loading && <p className="text-fg-muted text-sm">Summoning the roster…</p>}
      {error && <p className="text-accent text-sm">{error}</p>}

      <div className="grid gap-5 md:grid-cols-2">
        {guilds.map((guild, i) => (
          <motion.div
            key={guild.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link href={`/guilds/${guild.id}`} className="block h-full">
              <Card className="h-full hover:border-accent/60 transition-colors cursor-pointer">
                <div className="flex items-start gap-4">
                  <GuildSeal emblem={guild.emblem} name={guild.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="font-display text-lg leading-tight">{guild.name}</h2>
                      <span className="tabular text-xs text-value shrink-0">Lvl {guild.level}</span>
                    </div>
                    <p className="text-sm text-fg-muted mt-0.5">{guild.department}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between text-sm">
                  <span className="text-fg-muted">
                    Guardian <span className="text-fg">{guild.guardianName}</span>
                  </span>
                  <span className="flex items-center gap-3 text-fg-muted">
                    <span className="tabular">{guild.members.length} sworn</span>
                    <span className="tabular text-value">{guild.reputation} rep</span>
                  </span>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
