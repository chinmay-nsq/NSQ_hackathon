"use client";

import { Coins, Star, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageIn } from "@/components/motion/PageIn";
import { HoverLift } from "@/components/motion/HoverLift";
import { CountUp } from "@/components/motion/CountUp";
import { AnimatedBar } from "@/components/motion/AnimatedBar";
import { CompanionViewer } from "@/components/companion3d/CompanionViewer";

const XP_PER_LEVEL = 100;

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilePage() {
  const { employee } = useAuthStore();

  if (!employee) return null;

  const xpIntoLevel = employee.xp % XP_PER_LEVEL;

  return (
    <PageIn className="max-w-2xl">
      <PageHeader title="Profile" description="Your progress across Skibidi-Sprint." />

      <HoverLift>
        <Card className="glow-primary bg-grid relative overflow-hidden border-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_0%,var(--glow-primary),transparent)]" />
          <CardContent className="relative flex items-center gap-4 px-6 py-6">
            <Avatar className="glow-primary-strong size-16 ring-2 ring-primary/30">
              <AvatarFallback className="font-display bg-accent text-xl text-accent-foreground">
                {initials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-display text-xl tracking-wide uppercase">{employee.name}</h2>
              <p className="text-sm text-muted-foreground">{employee.email}</p>
              <Badge variant="secondary" className="mt-1.5 font-mono text-[10px] tracking-wide uppercase">
                {employee.title}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </HoverLift>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <HoverLift>
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                <Star className="size-4 text-xp" />
                Level {employee.level}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress to next level</span>
                <span className="tabular">
                  {xpIntoLevel} / {XP_PER_LEVEL} XP
                </span>
              </div>
              <AnimatedBar pct={xpIntoLevel} fillClassName="bg-xp shadow-[0_0_10px_0_var(--xp)]" className="mt-2" />
            </CardContent>
          </Card>
        </HoverLift>

        <HoverLift>
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                <Coins className="size-4 text-currency" />
                Coins
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="tabular font-display text-2xl">
                <CountUp value={employee.coins} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Spend these in Rewards.</p>
            </CardContent>
          </Card>
        </HoverLift>
      </div>

      {employee.companion && (
        <HoverLift className="mt-4">
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                <Sparkles className="size-4 text-primary" />
                Companion
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4 px-4">
              <CompanionViewer species={employee.companion.species} className="h-20 w-20 shrink-0" />
              <div className="flex flex-1 items-center justify-between">
                <div>
                  <p className="font-medium">{employee.companion.name}</p>
                  <p className="text-sm capitalize text-muted-foreground">{employee.companion.species}</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                  Bond Lvl {employee.companion.bondLevel}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </HoverLift>
      )}

      <Card className="mt-4 border-0">
        <CardContent className="flex items-center justify-between px-4">
          <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Total reputation</span>
          <span className="tabular font-medium text-primary">
            <CountUp value={employee.reputation} />
          </span>
        </CardContent>
        <Separator />
        <CardContent className="flex items-center justify-between px-4 pt-4">
          <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Total XP earned</span>
          <span className="tabular font-medium text-xp">
            <CountUp value={employee.xp} />
          </span>
        </CardContent>
      </Card>
    </PageIn>
  );
}
