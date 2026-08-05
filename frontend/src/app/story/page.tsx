"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, ApiRequestError } from "@/lib/api";
import { WeeklyStory } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";

export default function StoryPage() {
  const [story, setStory] = useState<WeeklyStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ story: WeeklyStory | null }>("/kingdom/story/latest")
      .then((data) => setStory(data.story))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load story"))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const data = await api.post<{ story: WeeklyStory }>("/kingdom/story/generate");
      setStory(data.story);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to generate story");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="The Royal Chronicle"
        title="This Week in the Kingdom"
        description="Once a week, the Chronicle is written fresh — a true account of what the guilds accomplished."
        action={
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 border border-accent text-accent text-[11px] label-caps hover:bg-accent hover:text-bg transition-colors disabled:opacity-40"
          >
            {generating ? "Writing…" : "Write This Week's Entry"}
          </button>
        }
      />

      {error && <p className="text-accent text-sm mb-4">{error}</p>}
      {loading && <p className="text-fg-muted text-sm">Fetching the archive…</p>}

      <AnimatePresence mode="wait">
        {story ? (
          <motion.article
            key={story.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl"
          >
            <p className="label-caps text-[11px] text-fg-muted mb-4">
              Entry for the week of {new Date(story.weekOf).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p
              className="font-display text-[19px] leading-[1.75] text-fg whitespace-pre-line"
              style={{
                fontFeatureSettings: '"dlig" 1',
              }}
            >
              <span
                className="float-left font-display italic pr-3 leading-[0.8]"
                style={{ fontSize: "4.2rem", marginTop: "0.1rem" }}
                aria-hidden
              >
                {story.content.charAt(0)}
              </span>
              {story.content.slice(1)}
            </p>
          </motion.article>
        ) : (
          !loading && (
            <p className="text-fg-muted text-sm max-w-md">
              The Chronicle is blank this week. Write this week&apos;s entry to see what the guilds
              have truly been up to.
            </p>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
