"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { useAuthStore } from "@/store/authStore";
import { ApiRequestError } from "@/lib/api";
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

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
        await register(email, password, name);
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
    <div ref={scope} className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-sm">
        <div ref={logoRef} className="mb-6 flex items-center justify-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Weatherline</span>
        </div>

        <Card ref={cardRef}>
          <CardHeader>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1">
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
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Password</Label>
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

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
