"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Seniority } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { gsap } from "@/lib/gsap/registerPlugins";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageIn } from "@/components/motion/PageIn";

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid-level" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
];

export default function ProfileOnboardingPage() {
  const [jobRole, setJobRole] = useState("");
  const [seniority, setSeniority] = useState<Seniority | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { employee, fetchMe } = useAuthStore();
  const router = useRouter();

  function addSkill() {
    const value = skillInput.trim();
    if (!value) return;
    if (skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSkillInput("");
      return;
    }
    if (skills.length >= 15) return;
    setSkills((prev) => [...prev, value]);
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
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
      await fetchMe();
      router.replace("/app");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
      shakeCard();
    } finally {
      setSubmitting(false);
    }
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
                  onChange={(e) => setJobRole(e.target.value)}
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
                      onClick={() => setSeniority(opt.value)}
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
                  onBlur={addSkill}
                  placeholder="Type a skill and press Enter — e.g. React, SQL, copywriting"
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
