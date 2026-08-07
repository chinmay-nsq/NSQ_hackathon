"use client";

import { useEffect, useState } from "react";
import { Newspaper, RefreshCw } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { WeeklyStory } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { TypewriterReveal } from "@/components/motion/TypewriterReveal";

export default function RecapPage() {
  const [story, setStory] = useState<WeeklyStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ story: WeeklyStory | null }>("/kingdom/story/latest")
      .then((data) => setStory(data.story))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load recap"))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const data = await api.post<{ story: WeeklyStory }>("/kingdom/story/generate");
      setStory(data.story);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to generate recap");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <PageIn className="max-w-2xl">
      <PageHeader
        title="Weekly Recap"
        description="An AI-written summary of what your teams accomplished this week."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="font-mono text-xs tracking-wide uppercase"
          >
            <RefreshCw className={generating ? "animate-spin" : ""} />
            {generating ? "Writing…" : "Generate this week's recap"}
          </Button>
        }
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <Skeleton className="h-40" />
      ) : story ? (
        <Card className="glow-primary bg-grid relative overflow-hidden border-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,var(--glow-primary),transparent)]" />
          <CardContent className="relative px-6 py-6">
            <p className="mb-4 font-mono text-xs font-medium tracking-widest text-primary uppercase">
              Week of{" "}
              {new Date(story.weekOf).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <TypewriterReveal text={story.content} className="text-base leading-relaxed" />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0">
          <CardContent className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <Newspaper className="size-6" />
            No recap yet. Generate this week&apos;s summary above.
          </CardContent>
        </Card>
      )}
    </PageIn>
  );
}
