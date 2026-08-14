"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, User, ShieldCheck, Users } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { useAuthStore, SelfRegisterableRole } from "@/store/authStore";
import { api, ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PETS } from "@/components/landing/petData";
import { MagneticCursor } from "@/components/landing/MagneticCursor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ROLE_OPTIONS: { value: SelfRegisterableRole; label: string; description: string; icon: typeof User }[] = [
  { value: "EMPLOYEE", label: "Employee", description: "Complete adventures, earn XP", icon: User },
  { value: "MANAGER", label: "Team Leader", description: "Also review & approve your team's tasks", icon: ShieldCheck },
];

const COMPANION_CYCLE_MS = 4200;

interface Ember {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  const [mode, setMode] = useState<"login" | "register">(inviteCode ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<SelfRegisterableRole>("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteTeamName, setInviteTeamName] = useState<string | null>(null);
  const [inviteInvalid, setInviteInvalid] = useState(false);
  const [petIndex, setPetIndex] = useState(0);

  const { login, register } = useAuthStore();
  const router = useRouter();
  const scope = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  // Lazy one-time random init — the ember field never needs to re-roll on rerender.
  const [embers] = useState<Ember[]>(() =>
    Array.from({ length: 26 }, () => ({
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 12 + Math.random() * 16,
      delay: -Math.random() * 26,
      drift: (Math.random() - 0.5) * 50,
    }))
  );

  const activePet = PETS[petIndex];

  useEffect(() => {
    if (!inviteCode) return;
    api
      .get<{ guild: { name: string } }>(`/guilds/invite/${inviteCode}`)
      .then((data) => setInviteTeamName(data.guild.name))
      .catch(() => setInviteInvalid(true));
  }, [inviteCode]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPetIndex((i) => (i + 1) % PETS.length);
    }, COMPANION_CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.fromTo(
        logoRef.current,
        { opacity: 0, y: -16, scale: 0.7, rotate: -12 },
        { opacity: 1, y: 0, scale: 1, rotate: 0, duration: 0.6, ease: "back.out(2.2)" }
      )
        .fromTo(
          portraitRef.current,
          { opacity: 0, scale: 0.7, rotate: 8 },
          { opacity: 1, scale: 1, rotate: 0, duration: 0.8, ease: "back.out(1.6)" },
          "-=0.35"
        )
        .fromTo(
          cardRef.current,
          { opacity: 0, y: 28, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out" },
          "-=0.5"
        );
    },
    { scope }
  );

  // Companion portrait + quote cross-fade on every rotation, independent of the entrance timeline above.
  useGSAP(
    () => {
      if (!portraitRef.current || !quoteRef.current) return;
      gsap.fromTo(
        portraitRef.current,
        { opacity: 0, scale: 0.9, rotate: -4 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.55, ease: "back.out(1.8)" }
      );
      gsap.fromTo(quoteRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.1 });
    },
    { dependencies: [petIndex], scope }
  );

  function shakeCard() {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { x: -8 },
      { x: 0, duration: 0.5, ease: "elastic.out(1.2, 0.3)" }
    );
  }

  function handleSubmitMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = submitRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.35;
    gsap.to(el, { x, y, duration: 0.3, ease: "power2.out" });
  }

  function handleSubmitMouseLeave() {
    if (!submitRef.current) return;
    gsap.to(submitRef.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name, inviteCode ? "EMPLOYEE" : role, inviteCode ?? undefined);
      }
      router.replace("/app");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
      shakeCard();
    } finally {
      setSubmitting(false);
    }
  }

  const showRolePicker = mode === "register" && !inviteCode;

  return (
    <div
      ref={scope}
      className="login-page bg-grid relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16"
    >
      <MagneticCursor />
      {/* Ambient world: layered glow + drifting embers, same cinematic language as the landing page */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_18%_15%,var(--glow-strong),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_55%_at_85%_85%,var(--glow-primary),transparent)]" />
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        {embers.map((p, i) => (
          <span
            key={i}
            className="ember-particle"
            style={
              {
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                "--drift": `${p.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_28rem]">
        {/* Companion showcase — hidden on small screens, the auth card carries the page alone there */}
        <div className="hidden flex-col items-center text-center lg:flex">
          <div
            ref={portraitRef}
            className="relative flex h-64 w-64 items-center justify-center"
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-full opacity-70 blur-3xl transition-colors duration-700"
              style={{ background: `radial-gradient(circle, ${activePet.color}aa, transparent 70%)` }}
            />
            <Image
              key={activePet.species}
              src={activePet.image}
              alt={activePet.name}
              width={280}
              height={280}
              className="relative object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
              priority
            />
          </div>
          <div ref={quoteRef} className="mt-2 max-w-xs">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase" style={{ color: activePet.color }}>
              {activePet.name} · {activePet.title}
            </p>
            <p className="mt-3 font-display text-base tracking-wide uppercase" style={{ color: activePet.color }}>
              ⚡ {activePet.ability}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">{activePet.abilityDescription}</p>
          </div>
          <div className="mt-6 flex gap-1.5">
            {PETS.map((pet, i) => (
              <button
                key={pet.species}
                type="button"
                data-cursor="magnetic"
                aria-label={`Show ${pet.name}`}
                onClick={() => setPetIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === petIndex ? "w-6 bg-primary" : "w-1.5 bg-foreground/20 hover:bg-foreground/35"
                )}
              />
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div ref={logoRef} className="mb-6 flex items-center justify-center gap-2.5">
            <div className="glow-primary-strong flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4.5" />
            </div>
            <span className="font-display text-xl tracking-wide uppercase">Skibidi-Sprint</span>
          </div>

          {mode === "register" && inviteCode && (
            <div className="glow-primary mb-4 flex items-center gap-2.5 rounded-lg border border-primary/30 bg-accent px-4 py-3">
              <Users className="size-4 shrink-0 text-primary" />
              <p className="text-sm">
                {inviteInvalid ? (
                  <span className="text-destructive">This invite link is invalid or expired.</span>
                ) : inviteTeamName ? (
                  <>
                    You&apos;re joining <span className="font-medium text-primary">{inviteTeamName}</span>
                  </>
                ) : (
                  "Checking invite link…"
                )}
              </p>
            </div>
          )}

          <Card ref={cardRef} className="glow-primary-strong relative overflow-hidden border-0">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,var(--glow-primary),transparent)]" />
            <CardHeader className="relative">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
                <TabsList className="w-full">
                  <TabsTrigger value="login" className="flex-1 font-mono text-xs tracking-wide uppercase">
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger value="register" className="flex-1 font-mono text-xs tracking-wide uppercase">
                    Register
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <CardTitle className="sr-only">
                {mode === "login" ? "Sign in" : "Create your account"}
              </CardTitle>
              <CardDescription className="pt-2">
                {mode === "login"
                  ? "Sign in to continue your progress."
                  : "Set up your account to start earning XP with your team."}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="font-mono text-xs tracking-wide uppercase">
                        Name
                      </Label>
                      <Input
                        id="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>

                    {showRolePicker && (
                      <div className="space-y-1.5">
                        <Label className="font-mono text-xs tracking-wide uppercase">Account type</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {ROLE_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const selected = role === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setRole(opt.value)}
                                className={cn(
                                  "flex flex-col items-start gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                                  selected
                                    ? "glow-primary border-primary bg-accent"
                                    : "border-border hover:bg-muted/50"
                                )}
                              >
                                <Icon className={cn("size-4", selected ? "text-primary" : "text-muted-foreground")} />
                                <span className="text-sm font-medium">{opt.label}</span>
                                <span className="text-xs text-muted-foreground">{opt.description}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="font-mono text-xs tracking-wide uppercase">
                    Email
                  </Label>
                  <Input
                    id="email"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="font-mono text-xs tracking-wide uppercase">
                    Password
                  </Label>
                  <Input
                    id="password"
                    required
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  ref={submitRef}
                  type="submit"
                  disabled={submitting}
                  data-cursor="magnetic"
                  onMouseMove={handleSubmitMouseMove}
                  onMouseLeave={handleSubmitMouseLeave}
                  className="glow-primary w-full font-mono text-xs tracking-widest uppercase"
                >
                  {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
