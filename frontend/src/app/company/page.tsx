"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Kingdom, KingdomProject } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ResourceMeter } from "@/components/ResourceMeter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { HoverLift } from "@/components/motion/HoverLift";

const RESOURCES = ["knowledge", "gold", "influence", "materials"] as const;

export default function CompanyPage() {
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
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load company goals"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageIn>
      <PageHeader
        title={kingdom?.name ?? "Company Goals"}
        description="Teams contribute resources earned from adventures toward shared company-wide goals."
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : (
        <StaggerGrid className="grid gap-4 md:grid-cols-2" deps={[projects.length]}>
          {projects.map((project) => (
            <HoverLift key={project.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{project.name}</CardTitle>
                    {project.unlocked && (
                      <Badge className="bg-success text-success-foreground shrink-0">
                        <CheckCircle2 />
                        Unlocked
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4">
                  <p className="mb-4 text-sm text-muted-foreground">{project.description}</p>
                  {!project.unlocked && (
                    <div className="space-y-3">
                      {RESOURCES.map((r) => {
                        const needed = project[`${r}Needed` as const];
                        const contributed = project[`${r}Contributed` as const];
                        if (needed === 0) return null;
                        return <ResourceMeter key={r} resource={r} current={contributed} needed={needed} />;
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </HoverLift>
          ))}
        </StaggerGrid>
      )}

      {!loading && projects.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">No company goals set up yet.</p>
      )}
    </PageIn>
  );
}
