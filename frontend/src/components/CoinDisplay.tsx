"use client";

import { Coins } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { CountUp } from "@/components/motion/CountUp";

/**
 * Persistent coin balance shown in the top bar. Carries `data-coin-target`
 * so `flyCoinsToBalance()` (see lib/gsap/coinFly.ts) has a stable element to
 * animate coins toward from anywhere in the app.
 */
export function CoinDisplay() {
  const { employee } = useAuthStore();
  if (!employee) return null;

  return (
    <div
      data-coin-target
      className="ml-auto flex items-center gap-1.5 rounded-full border border-yellow/40 bg-yellow-soft px-2.5 py-1"
    >
      <Coins className="size-3.5 text-yellow-foreground" />
      <span className="tabular text-xs font-semibold text-yellow-foreground">
        <CountUp value={employee.coins ?? 0} duration={0.6} />
      </span>
    </div>
  );
}
