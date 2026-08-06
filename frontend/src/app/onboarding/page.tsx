"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bird, Bot, Cat, Feather, PawPrint, type LucideIcon } from "lucide-react";
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

const SPECIES_META: Record<string, { label: string; icon: LucideIcon }> = {
  dragon: { label: "Dragon", icon: Feather },
  robot: { label: "Robot", icon: Bot },
  fox: { label: "Fox", icon: PawPrint },
  owl: { label: "Owl", icon: Bird },
  panda: { label: "Panda", icon: Cat },
};

const FALLBACK_SPECIES = ["dragon", "robot", "fox", "owl", "panda"];

export default function OnboardingPage() {
  const [species, setSpecies] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { employee, fetchMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    api
      .get<{ species: string[] }>("/companion/species")
      .then((data) => setSpecies(data.species))
      .catch(() => setSpecies(FALLBACK_SPECIES))
      .finally(() => setLoadingSpecies(false));
  }, []);

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
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/companion/", { species: selected, name: name.trim() });
      await fetchMe();
      router.replace("/app");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
      <PageIn className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {employee?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick an AI companion — it&apos;ll coach you, track your progress, and keep you posted on
            your team&apos;s goals.
          </p>
        </div>

        {selected && (
          <CompanionViewer species={selected} className="mx-auto mb-6 h-48 w-48" />
        )}

        {loadingSpecies ? (
          <p className="text-center text-sm text-muted-foreground">Loading companions…</p>
        ) : (
          <StaggerGrid className="grid grid-cols-3 gap-3 sm:grid-cols-5" deps={[species.length]}>
            {species.map((s) => {
              const meta = SPECIES_META[s] ?? { label: s, icon: PawPrint };
              const Icon = meta.icon;
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
                      "cursor-pointer items-center py-5 transition-colors hover:bg-accent",
                      isSelected && "bg-accent ring-2 ring-primary"
                    )}
                  >
                    <CardContent className="flex flex-col items-center gap-2 px-2">
                      <Icon className={cn("size-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-medium capitalize">{meta.label}</span>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </StaggerGrid>
        )}

        {selected && (
          <div className="mx-auto mt-6 max-w-xs space-y-1.5">
            <Label htmlFor="companion-name">
              Name your {SPECIES_META[selected]?.label.toLowerCase() ?? selected}
            </Label>
            <Input
              id="companion-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nova"
              maxLength={30}
            />
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex justify-center">
          <Button onClick={handleConfirm} disabled={!selected || submitting} size="lg">
            {submitting ? "Setting up…" : "Continue"}
          </Button>
        </div>
      </PageIn>
    </div>
  );
}
