"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { gsap } from "@/lib/gsap/registerPlugins";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { CompanionViewer } from "@/components/companion3d/CompanionViewer";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

const SPECIES_META: Record<string, { label: string; title: string }> = {
  barbarian: { label: "Barb", title: "The Loyal Flame" },
  archer: { label: "Hawk", title: "The Steady Aim" },
  witch: { label: "Raven", title: "The Quiet Wisdom" },
  hog_rider: { label: "Charger", title: "The Reckless Push" },
  balloon: { label: "Drift", title: "The Perfect Timing" },
  dragon: { label: "Ember", title: "The Big Hype" },
  lava_hound: { label: "Basalt", title: "The Steady Shield" },
};

const FALLBACK_SPECIES = ["barbarian", "archer", "witch", "hog_rider", "balloon", "dragon", "lava_hound"];

export default function OnboardingPage() {
  const [species, setSpecies] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [fetchingAvailability, setFetchingAvailability] = useState(false);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { employee, fetchMe } = useAuthStore();
  const router = useRouter();
  const trimmedName = name.trim();
  const debouncedName = useDebouncedValue(trimmedName, 400);
  // Still true while the debounce timer is settling, not just while the
  // request itself is in flight — otherwise the indicator disappears for the
  // 400ms gap between keystrokes stopping and the check actually firing.
  const checkingName = trimmedName !== "" && (trimmedName !== debouncedName || fetchingAvailability);

  useEffect(() => {
    api
      .get<{ species: string[] }>("/companion/species")
      .then((data) => setSpecies(data.species))
      .catch(() => setSpecies(FALLBACK_SPECIES))
      .finally(() => setLoadingSpecies(false));
  }, []);

  useEffect(() => {
    if (!debouncedName) return;
    let cancelled = false;
    api
      .get<{ available: boolean }>(`/companion/check-name?name=${encodeURIComponent(debouncedName)}`)
      .then((data) => {
        if (!cancelled) setNameAvailable(data.available);
      })
      .catch(() => {
        if (!cancelled) setNameAvailable(null);
      })
      .finally(() => {
        if (!cancelled) setFetchingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedName]);

  function handleSelect(s: string) {
    setSelected(s);
    const el = cardRefs.current[s];
    if (el) {
      gsap.fromTo(el, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
    }
  }

  async function handleConfirm() {
    if (!selected) {
      setError("Choose a companion first.");
      return;
    }
    if (!name.trim()) {
      setError("Give your companion a name.");
      return;
    }
    if (nameAvailable === false) {
      setError("That companion name is already taken — try another.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/companion/", { species: selected, name: name.trim() });
      await fetchMe();
      router.replace("/onboarding/profile");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-grid relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_0%,var(--glow-primary),transparent)]" />
      <PageIn className="relative w-full max-w-xl">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase">Skibidi-Sprint</p>
          <h1 className="font-display mt-2 text-3xl tracking-wide uppercase sm:text-4xl">
            Welcome, {employee?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Pick an AI companion — it&apos;ll coach you, track your progress, and keep you posted on
            your team&apos;s goals.
          </p>
        </div>

        {selected && (
          <CompanionViewer species={selected} className="glow-primary-strong mx-auto mb-6 h-48 w-48 rounded-full" />
        )}

        {loadingSpecies ? (
          <p className="text-center text-sm text-muted-foreground">Loading companions…</p>
        ) : (
          <StaggerGrid className="mx-auto grid max-w-lg grid-cols-4 gap-3" deps={[species.length]}>
            {species.map((s) => {
              const meta = SPECIES_META[s] ?? { label: s, title: "" };
              const isSelected = selected === s;
              return (
                <button
                  key={s}
                  type="button"
                  ref={(el) => {
                    cardRefs.current[s] = el;
                  }}
                  onClick={() => handleSelect(s)}
                >
                  <Card
                    className={cn(
                      "cursor-pointer items-center border-0 py-5 transition-colors hover:bg-accent",
                      isSelected && "glow-primary bg-accent"
                    )}
                  >
                    <CardContent className="flex flex-col items-center gap-2 px-2">
                      <CompanionViewer species={s} interactive={false} className="size-14" />
                      <span className="font-mono text-[11px] tracking-wide uppercase">{meta.label}</span>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </StaggerGrid>
        )}

        {selected && (
          <div className="mx-auto mt-6 max-w-xs space-y-1.5 text-center">
            {SPECIES_META[selected]?.title && (
              <p className="font-mono text-[11px] tracking-widest text-primary uppercase">
                {SPECIES_META[selected].title}
              </p>
            )}
            <Label
              htmlFor="companion-name"
              className="font-mono text-xs tracking-wide uppercase"
            >
              Name your companion
            </Label>
            <div className="relative">
              <Input
                id="companion-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameAvailable(null);
                  setFetchingAvailability(true);
                }}
                placeholder="e.g. Nova"
                maxLength={30}
                className="pr-9"
              />
              <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                {checkingName ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : nameAvailable === true ? (
                  <Check className="size-4 text-success" />
                ) : nameAvailable === false ? (
                  <X className="size-4 text-destructive" />
                ) : null}
              </div>
            </div>
            {nameAvailable === false && !checkingName && (
              <p className="text-xs text-destructive">That name is already taken — try another.</p>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleConfirm}
            disabled={!selected || submitting || checkingName || nameAvailable === false}
            size="lg"
            className="glow-primary font-mono text-xs tracking-widest uppercase"
          >
            {submitting ? "Setting up…" : "Continue"}
          </Button>
        </div>
      </PageIn>
    </div>
  );
}
