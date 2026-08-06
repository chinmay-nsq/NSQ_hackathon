"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Coins, Star } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { Adventure, Employee } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageIn } from "@/components/motion/PageIn";
import { gsap } from "@/lib/gsap/registerPlugins";
import { celebrationBurst } from "@/lib/gsap/burst";

const TYPE_LABEL: Record<string, string> = {
  SOLO: "Solo",
  GUILD: "Team",
  CROSS_GUILD: "Company",
};

export default function AdventureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { fetchMe } = useAuthStore();

  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState("");
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    api
      .get<{ adventures: Adventure[] }>("/adventures/")
      .then((data) => {
        const found = data.adventures.find((a) => a.id === params.id);
        setAdventure(found ?? null);
      })
      .catch(() => setAdventure(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleComplete() {
    if (!adventure) return;
    setCompleting(true);
    setError(null);
    try {
      await api.post<{ employee: Employee }>(`/adventures/${adventure.id}/complete`, {
        submission: submission.trim() || undefined,
      });

      const btn = completeButtonRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        celebrationBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        gsap.fromTo(btn, { scale: 1 }, { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1, ease: "power1.inOut" });
      }

      toast.success(`+${adventure.xpReward} XP, +${adventure.coinReward} coins`, {
        description: "Adventure complete.",
      });
      await fetchMe();
      setTimeout(() => router.push("/adventures"), 550);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not complete this adventure.");
      setCompleting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading adventure…</p>;
  }

  if (!adventure) {
    return (
      <div>
        <Link href="/adventures" className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 inline size-3.5" />
          Back to adventures
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">Adventure not found.</p>
      </div>
    );
  }

  const completed = Boolean(adventure.progress?.[0]?.completed);

  return (
    <PageIn className="max-w-2xl">
      <Link
        href="/adventures"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 size-3.5" />
        Back to adventures
      </Link>

      <Card>
        <CardContent className="px-6 py-6">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline" className="uppercase">
              {TYPE_LABEL[adventure.type] ?? adventure.type}
            </Badge>
            {completed && (
              <Badge className="bg-success text-success-foreground">
                <CheckCircle2 />
                Completed
              </Badge>
            )}
          </div>

          <h1 className="text-xl font-semibold tracking-tight">{adventure.title}</h1>
          <p className="mt-2 leading-relaxed text-muted-foreground">{adventure.description}</p>

          <div className="mt-5 flex gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Star className="size-4 text-xp" />
              <span className="tabular font-medium">{adventure.xpReward}</span>
              <span className="text-muted-foreground">XP</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Coins className="size-4 text-currency" />
              <span className="tabular font-medium">{adventure.coinReward}</span>
              <span className="text-muted-foreground">coins</span>
            </span>
          </div>

          {!completed && (
            <>
              <div className="mt-6 space-y-1.5">
                <Label htmlFor="submission">Notes (optional)</Label>
                <Textarea
                  id="submission"
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  placeholder="Add a quick note about what you did…"
                  maxLength={2000}
                  rows={3}
                />
              </div>

              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

              <Button ref={completeButtonRef} onClick={handleComplete} disabled={completing} className="mt-4">
                {completing ? "Completing…" : "Mark complete"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </PageIn>
  );
}
