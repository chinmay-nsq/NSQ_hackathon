"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, Gift } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { MarketplaceItem, Employee } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIn } from "@/components/motion/PageIn";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { HoverLift } from "@/components/motion/HoverLift";
import { CountUp } from "@/components/motion/CountUp";
import { celebrationBurst } from "@/lib/gsap/burst";

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
      await fetchMe();
      const btn = buttonRefs.current[item.id];
      if (btn) {
        const rect = btn.getBoundingClientRect();
        celebrationBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, 12);
      }
      toast.success(`Redeemed ${item.name}`);
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
            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
              <Coins className="size-4 text-currency" />
              <span className="tabular font-medium">
                <CountUp value={employee.coins} />
              </span>
            </div>
          )
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" deps={[items.length]}>
          {items.map((item) => {
            const canAfford = (employee?.coins ?? 0) >= item.cost;
            return (
              <HoverLift key={item.id} className="h-full">
                <Card className="flex h-full flex-col">
                  <CardContent className="flex flex-1 flex-col px-4">
                    <Gift className="size-5 text-muted-foreground" />
                    <p className="mt-3 font-medium">{item.name}</p>
                    <p className="mt-1 flex-1 text-sm text-muted-foreground">{item.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="tabular flex items-center gap-1 text-sm font-medium text-currency-foreground">
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
                      >
                        {purchasingId === item.id ? "Redeeming…" : canAfford ? "Redeem" : "Not enough"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </HoverLift>
            );
          })}
        </StaggerGrid>
      )}
    </PageIn>
  );
}
