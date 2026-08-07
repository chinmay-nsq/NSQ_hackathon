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
      className="glow-primary ml-auto flex items-center gap-1.5 rounded-full border border-currency/30 bg-currency/10 px-3 py-1"
    >
      <Coins className="size-3.5 text-currency" />
      <span className="tabular font-mono text-xs font-medium">
        <CountUp value={employee.coins ?? 0} duration={0.6} />
      </span>
    </div>
  );
}
