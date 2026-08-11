"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Seniority, ProfileSuggestion } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { gsap } from "@/lib/gsap/registerPlugins";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageIn } from "@/components/motion/PageIn";
import { CompanionViewer } from "@/components/companion3d/CompanionViewer";

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid-level" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
];

export default function ProfileOnboardingPage() {
  const [jobRole, setJobRole] = useState("");
  const [seniority, setSeniority] = useState<Seniority | null>(null);
  const [seniorityTouched, setSeniorityTouched] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { employee, fetchMe } = useAuthStore();
  const router = useRouter();
  const debouncedJobRole = useDebouncedValue(jobRole.trim(), 700);

  useEffect(() => {
    if (debouncedJobRole.length < 2) return;
    let cancelled = false;
    api
      .post<{ suggestion: ProfileSuggestion }>("/employees/me/suggest-profile", { jobRole: debouncedJobRole })
      .then((data) => {
        if (cancelled) return;
        setSuggested(data.suggestion.skills);
        // Only auto-pick seniority if the person hasn't deliberately chosen
        // one themselves — a suggestion should never override an explicit
        // choice, even if they tweak the job title afterward.
        if (!seniorityTouched) setSeniority(data.suggestion.seniority);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSuggesting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedJobRole, seniorityTouched]);

  function addSkill(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
    if (skills.length >= 15) return;
    setSkills((prev) => [...prev, trimmed]);
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  function toggleSuggestedSkill(skill: string) {
    if (skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      removeSkill(skill);
    } else {
      addSkill(skill);
    }
  }

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
      setSkillInput("");
    }
  }

  function shakeCard() {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1.2, 0.3)" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobRole.trim()) {
      setError("Tell us your role.");
      shakeCard();
      return;
    }
    if (!seniority) {
      setError("Pick your experience level.");
      shakeCard();
      return;
    }
    if (skills.length === 0) {
      setError("Add at least one skill.");
      shakeCard();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/employees/me/profile", { jobRole: jobRole.trim(), seniority, skills });

      // fetchMe() is deliberately deferred until the welcome screen (below)
      // is dismissed: AppShell redirects away from /onboarding/profile the
      // instant employee.profileCompletedAt is truthy, and refreshing here
      // would yank the user to /app before they ever see the companion's
      // welcome message.
      const welcome = await api
        .get<{ message: string | null }>("/employees/me/guild-welcome")
        .catch(() => ({ message: null }));

      if (welcome.message) {
        setWelcomeMessage(welcome.message);
      } else {
        await fetchMe();
        router.replace("/app");
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
      shakeCard();
    } finally {
      setSubmitting(false);
    }
  }

  const unpickedSuggestions = suggested.filter(
    (s) => !skills.some((picked) => picked.toLowerCase() === s.toLowerCase())
  );

  if (welcomeMessage) {
    return (
      <div className="bg-grid relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_0%,var(--glow-primary),transparent)]" />
        <PageIn className="relative w-full max-w-md text-center">
          {employee?.companion && (
            <CompanionViewer
              species={employee.companion.species}
              className="glow-primary-strong mx-auto mb-6 h-40 w-40 rounded-full"
            />
          )}
          <p className="font-mono text-xs tracking-[0.25em] text-primary uppercase">
            {employee?.companion?.name ?? "Your companion"} says
          </p>
          <p className="mt-4 text-lg leading-relaxed">{welcomeMessage}</p>
          <Button
            onClick={async () => {
              await fetchMe();
              router.replace("/app");
            }}
            size="lg"
            className="glow-primary mt-8 w-full font-mono text-xs tracking-widest uppercase"
          >
            Enter the kingdom
          </Button>
        </PageIn>
      </div>
    );
  }

  return (
    <div className="bg-grid relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_0%,var(--glow-primary),transparent)]" />
      <PageIn className="relative w-full max-w-xl">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase">
            One last thing, {employee?.name?.split(" ")[0] ?? "there"}
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-wide uppercase sm:text-4xl">Complete your profile</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your role, level, and skills shape the daily adventures your companion generates for
            you.
          </p>
        </div>

        <Card ref={cardRef} className="glow-primary border-0">
          <CardContent className="px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="job-role" className="font-mono text-xs tracking-wide uppercase">
                  Your role
                </Label>
                <Input
                  id="job-role"
                  value={jobRole}
                  onChange={(e) => {
                    setJobRole(e.target.value);
                    if (e.target.value.trim().length >= 2) setSuggesting(true);
                  }}
                  placeholder="e.g. Frontend Engineer"
                  maxLength={80}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-xs tracking-wide uppercase">Experience level</Label>
                <div className="grid grid-cols-4 gap-2">
                  {SENIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSeniority(opt.value);
                        setSeniorityTouched(true);
                      }}
                      className={cn(
                        "rounded-lg border px-2 py-2.5 text-center text-sm transition-colors",
                        seniority === opt.value
                          ? "glow-primary border-primary bg-accent font-medium text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="skills" className="font-mono text-xs tracking-wide uppercase">
                  Skills
                </Label>
                <Input
                  id="skills"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  onBlur={() => {
                    addSkill(skillInput);
                    setSkillInput("");
                  }}
                  placeholder="Type a skill and press Enter, or pick a suggestion below"
                  maxLength={40}
                />

                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="gap-1 font-mono text-[10px] tracking-wide uppercase"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-0.5 rounded-full hover:text-destructive"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {(suggesting || unpickedSuggestions.length > 0) && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="size-3" />
                      {suggesting ? "Suggesting skills for this role…" : "Suggested — tap to add"}
                    </div>
                    {!suggesting && (
                      <div className="flex flex-wrap gap-1.5">
                        {unpickedSuggestions.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSuggestedSkill(skill)}
                            className="rounded-full border border-dashed border-border px-2.5 py-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase transition-colors hover:border-primary hover:text-primary"
                          >
                            + {skill}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="glow-primary w-full font-mono text-xs tracking-widest uppercase"
              >
                {submitting ? "Saving…" : "Start earning XP"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageIn>
    </div>
  );
}
