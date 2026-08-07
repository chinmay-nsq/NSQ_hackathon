"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, User, ShieldCheck } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { useAuthStore, SelfRegisterableRole } from "@/store/authStore";
import { ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
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

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<SelfRegisterableRole>("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuthStore();
  const router = useRouter();
  const scope = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.fromTo(
        logoRef.current,
        { opacity: 0, y: -16, scale: 0.7, rotate: -12 },
        { opacity: 1, y: 0, scale: 1, rotate: 0, duration: 0.6, ease: "back.out(2.2)" }
      ).fromTo(
        cardRef.current,
        { opacity: 0, y: 28, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out" },
        "-=0.3"
      );
    },
    { scope }
  );

  function shakeCard() {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { x: -8 },
      { x: 0, duration: 0.5, ease: "elastic.out(1.2, 0.3)" }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
      router.replace("/app");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
      shakeCard();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={scope}
      className="bg-grid relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_50%_0%,var(--glow-primary),transparent)]" />
      <div className="relative w-full max-w-sm">
        <div ref={logoRef} className="mb-6 flex items-center justify-center gap-2.5">
          <div className="glow-primary-strong flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4.5" />
          </div>
          <span className="font-display text-xl tracking-wide uppercase">Weatherline</span>
        </div>

        <Card ref={cardRef} className="glow-primary border-0">
          <CardHeader>
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
          <CardContent>
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
                type="submit"
                disabled={submitting}
                className="glow-primary w-full font-mono text-xs tracking-widest uppercase"
              >
                {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
