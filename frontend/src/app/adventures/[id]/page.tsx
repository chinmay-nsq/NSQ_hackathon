"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Coins, Star, XCircle } from "lucide-react";
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
import { flyCoinsToBalance } from "@/lib/gsap/coinFly";
import { QuizRunner, type QuizResult } from "@/components/adventures/QuizRunner";
import { QuizReview } from "@/components/adventures/QuizReview";

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

  async function handleComplete(quiz?: QuizResult) {
    if (!adventure) return;
    setCompleting(true);
    setError(null);
    try {
      const result = await api.post<{ pendingApproval: boolean; employee?: Employee }>(
        `/adventures/${adventure.id}/complete`,
        { submission: submission.trim() || undefined, quiz }
      );

      const btn = completeButtonRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        celebrationBurst(origin);
        gsap.fromTo(btn, { scale: 1 }, { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1, ease: "power1.inOut" });
        // Plays on every completion, pending or not — pending ones haven't
        // actually been credited yet (a manager still has to approve), but
        // the animation itself is what the user asked to always see here.
        flyCoinsToBalance(origin, 8);
      }

      if (result.pendingApproval) {
        toast.success("Submitted for review", {
          description: "Your manager will approve this before it's credited.",
        });
      } else if (quiz) {
        toast.success(`+${adventure.xpReward} XP, +${quiz.correctCount * 5} coins`, {
          description: `${quiz.correctCount} / ${quiz.answers.length} correct.`,
        });
      } else {
        toast.success(`+${adventure.xpReward} XP, +${adventure.coinReward} coins`, {
          description: "Adventure complete.",
        });
      }
      await fetchMe();
      // Give the coin-fly animation time to actually land before navigating
      // away — cutting away mid-flight (it takes ~1.1s for 8 coins) looked broken.
      setTimeout(() => router.push("/adventures"), 1200);
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

  const progress = adventure.progress?.[0];
  const completed = Boolean(progress?.completed);
  const approval = progress?.approval ?? "NONE";
  const hasQuiz = Boolean(adventure.quiz && adventure.quiz.length > 0);
  const isActiveQuiz = !completed && hasQuiz;
  const isCompletedQuiz = completed && hasQuiz;

  return (
    <PageIn className={hasQuiz ? "w-full" : "max-w-2xl"}>
      <Link
        href="/adventures"
        className="mb-4 inline-flex items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary"
      >
        <ArrowLeft className="mr-1 size-3.5" />
        Back to adventures
      </Link>

      <Card className="glow-primary bg-grid relative overflow-hidden border-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,var(--glow-primary),transparent)]" />
        <CardContent className="relative px-6 py-6">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
              {TYPE_LABEL[adventure.type] ?? adventure.type}
            </Badge>
            {approval === "PENDING" && (
              <Badge variant="secondary" className="font-mono text-[10px] tracking-wide uppercase">
                <Clock />
                Pending approval
              </Badge>
            )}
            {approval === "REJECTED" && (
              <Badge className="bg-destructive/10 font-mono text-[10px] tracking-wide text-destructive uppercase">
                <XCircle />
                Rejected
              </Badge>
            )}
            {completed && approval === "APPROVED" && (
              <Badge className="bg-success font-mono text-[10px] tracking-wide text-success-foreground uppercase">
                <CheckCircle2 />
                Completed
              </Badge>
            )}
          </div>

          <h1 className="font-display text-2xl tracking-wide uppercase">{adventure.title}</h1>
          <p className="mt-2 leading-relaxed text-muted-foreground">{adventure.description}</p>

          {progress?.rejectionNote && (
            <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {progress.rejectionNote}
            </p>
          )}

          <div className="mt-5 flex gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Star className="size-4 text-xp" />
              <span className="tabular font-medium">{adventure.xpReward}</span>
              <span className="text-muted-foreground">XP</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Coins className="size-4 text-currency" />
              <span className="tabular font-medium">
                {adventure.quiz && adventure.quiz.length > 0 ? `up to ${adventure.coinReward}` : adventure.coinReward}
              </span>
              <span className="text-muted-foreground">coins</span>
            </span>
          </div>

          {isActiveQuiz && adventure.quiz && (
            <>
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
              <QuizRunner
                questions={adventure.quiz}
                submitting={completing}
                onSubmit={(result) => void handleComplete(result)}
              />
            </>
          )}

          {isCompletedQuiz && adventure.quiz && progress?.quizAnswers && (
            <QuizReview questions={adventure.quiz} answers={progress.quizAnswers} />
          )}

          {!completed && !hasQuiz && (
            <>
              <div className="mt-6 space-y-1.5">
                <Label htmlFor="submission" className="font-mono text-xs tracking-wide uppercase">
                  Notes (optional)
                </Label>
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

              <Button
                ref={completeButtonRef}
                onClick={() => void handleComplete()}
                disabled={completing}
                className="glow-primary mt-4 font-mono text-xs tracking-wide uppercase"
              >
                {completing ? "Completing…" : "Mark complete"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </PageIn>
  );
}
