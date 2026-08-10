"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { MarketplaceItem, Employee } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { CountUp } from "@/components/motion/CountUp";
import { celebrationBurst } from "@/lib/gsap/burst";
import { flyCoinsFromBalance } from "@/lib/gsap/coinFly";
import { RewardTile } from "@/components/rewards/RewardTile";

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
        celebrationBurst(origin, 16);
        // Coins visibly leave the top-bar balance and land on the tile being claimed.
        flyCoinsFromBalance(origin, 8);
      }
      toast.success(`Redeemed ${item.name}`);

      // Delay the balance refresh so the number doesn't jump down before the
      // coins finish visually leaving — otherwise it reads as "already spent"
      // while coins are still mid-flight toward the tile.
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
            <div
              data-coin-target
              className="glow-primary flex items-center gap-2 rounded-full border border-currency/30 bg-currency/10 px-4 py-1.5"
            >
              <Coins className="size-4 text-currency" />
              <span className="tabular font-mono font-medium">
                <CountUp value={employee.coins} />
              </span>
            </div>
          )
        }
      />

      {loading ? (
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-56 shrink-0 rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
          <PackageOpen className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-medium">No rewards available yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Check back soon — your kingdom is still stocking the vault.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
          {items.map((item, i) => (
            <RewardTile
              key={item.id}
              item={item}
              index={i}
              canAfford={(employee?.coins ?? 0) >= item.cost}
              coinsShort={Math.max(0, item.cost - (employee?.coins ?? 0))}
              redeeming={purchasingId === item.id}
              onRedeem={() => handlePurchase(item)}
              buttonRef={(el) => {
                buttonRefs.current[item.id] = el;
              }}
            />
          ))}
        </div>
      )}
    </PageIn>
  );
}
