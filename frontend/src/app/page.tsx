"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, ApiRequestError } from "@/lib/api";
import { Kingdom, KingdomProject } from "@/lib/types";
import { Card } from "@/components/Card";
import { ResourceBar } from "@/components/ResourceBar";
import { PageHeader } from "@/components/PageHeader";

const RESOURCES = ["knowledge", "gold", "influence", "materials"] as const;

export default function KingdomPage() {
  const [kingdom, setKingdom] = useState<Kingdom | null>(null);
  const [projects, setProjects] = useState<KingdomProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ kingdom: Kingdom; projects: KingdomProject[] }>("/kingdom/")
      .then((data) => {
        setKingdom(data.kingdom);
        setProjects(data.projects);
      })
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load kingdom"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Realm Overview"
        title={kingdom?.name ?? "The Kingdom"}
        description="Guilds pool the resources they earn from adventures here, to raise new buildings for everyone."
      />

      {loading && <p className="text-fg-muted text-sm">Reading the ledgers…</p>}
      {error && <p className="text-accent text-sm">{error}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
          >
            <Card
              eyebrow={project.unlocked ? "Completed Works" : "Under Construction"}
              title={project.name}
            >
              <p className="text-sm text-fg-muted leading-relaxed mb-5">{project.description}</p>

              {project.unlocked ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Unlocked by the guilds&apos; combined effort
                </div>
              ) : (
                <div className="space-y-3.5">
                  {RESOURCES.map((r) => {
                    const needed = project[`${r}Needed` as const];
                    const contributed = project[`${r}Contributed` as const];
                    if (needed === 0) return null;
                    return <ResourceBar key={r} resource={r} current={contributed} needed={needed} />;
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {!loading && projects.length === 0 && !error && (
        <p className="text-fg-muted text-sm">No kingdom projects have been chartered yet.</p>
      )}
    </div>
  );
}
