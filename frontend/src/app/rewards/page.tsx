"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, Gift } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { MarketplaceItem, Employee } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { CountUp } from "@/components/motion/CountUp";
import { celebrationBurst } from "@/lib/gsap/burst";
import { flyCoinsFromBalance } from "@/lib/gsap/coinFly";

export default function RewardsPage() {
  const { employee, fetchMe } = useAuthStore();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    api
      .get<{ items: MarketplaceItem[] }>("/marketplace/")
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  async function handlePurchase(item: MarketplaceItem) {
    setPurchasingId(item.id);
    try {
      await api.post<{ employee: Employee }>(`/marketplace/${item.id}/purchase`);

      const btn = buttonRefs.current[item.id];
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        celebrationBurst(origin, 12);
        // Coins visibly leave the top-bar balance and land on the button being clicked.
        flyCoinsFromBalance(origin, 8);
      }
      toast.success(`Redeemed ${item.name}`);

      // Delay the balance refresh so the number doesn't jump down before the
      // coins finish visually leaving — otherwise it reads as "already spent"
      // while coins are still mid-flight toward the button.
      setTimeout(() => {
        void fetchMe();
      }, 500);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "That purchase didn't go through.");
    } finally {
      setPurchasingId(null);
    }
  }

  return (
    <PageIn>
      <PageHeader
        title="Rewards"
        description="Spend coins earned from adventures on real rewards."
        action={
          employee && (
            <div className="glow-primary flex items-center gap-2 rounded-full border border-currency/30 bg-currency/10 px-4 py-1.5">
              <Coins className="size-4 text-currency" />
              <span className="tabular font-mono font-medium">
                <CountUp value={employee.coins} />
              </span>
            </div>
          )
        }
      />

      {loading ? (
        <div className="space-y-px">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <StaggerGrid className="divide-y divide-border/60 border-t border-border/60" deps={[items.length]}>
          {items.map((item) => {
            const canAfford = (employee?.coins ?? 0) >= item.cost;
            return (
              <div key={item.id} className="flex items-center gap-4 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Gift className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <span className="tabular flex shrink-0 items-center gap-1 font-mono text-sm font-medium text-currency-foreground">
                  <Coins className="size-3.5" />
                  {item.cost}
                </span>
                <Button
                  ref={(el) => {
                    buttonRefs.current[item.id] = el;
                  }}
                  size="sm"
                  variant={canAfford ? "default" : "secondary"}
                  disabled={!canAfford || purchasingId === item.id}
                  onClick={() => handlePurchase(item)}
                  className={cn(
                    "shrink-0 font-mono text-xs tracking-wide uppercase",
                    canAfford && "glow-primary"
                  )}
                >
                  {purchasingId === item.id ? "Redeeming…" : canAfford ? "Redeem" : "Not enough"}
                </Button>
              </div>
            );
          })}
        </StaggerGrid>
      )}
    </PageIn>
  );
}
