"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Coins, Gift, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { MarketplaceItem, Employee, Purchase } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageIn } from "@/components/motion/PageIn";
import { CountUp } from "@/components/motion/CountUp";
import { celebrationBurst } from "@/lib/gsap/burst";
import { flyCoinsFromBalance } from "@/lib/gsap/coinFly";
import { RewardTile } from "@/components/rewards/RewardTile";
import { PurchaseConfirmDialog } from "@/components/rewards/PurchaseConfirmDialog";
import { REWARD_ICONS } from "@/lib/rewardIcons";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function RewardsPage() {
  const { employee, fetchMe } = useAuthStore();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<MarketplaceItem | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    api
      .get<{ items: MarketplaceItem[] }>("/marketplace/")
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const loadPurchases = useCallback(() => {
    return api
      .get<{ purchases: Purchase[] }>("/marketplace/purchases/me")
      .then((data) => setPurchases(data.purchases))
      .catch(() => setPurchases([]))
      .finally(() => setPurchasesLoading(false));
  }, []);

  useEffect(() => {
    void loadPurchases();
  }, [loadPurchases]);

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
      setConfirmItem(null);
      void loadPurchases();

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

      <Tabs defaultValue="marketplace">
        <TabsList>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="purchases">My Purchases {purchases.length > 0 && `(${purchases.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace">
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
                  onRedeem={() => setConfirmItem(item)}
                  buttonRef={(el) => {
                    buttonRefs.current[item.id] = el;
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchases">
          {purchasesLoading ? (
            <div className="space-y-px">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
              <PackageOpen className="size-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="font-medium">No purchases yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Everything you redeem from the marketplace will show up here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 border-t border-border/60">
              {purchases.map((purchase) => {
                const Icon = REWARD_ICONS[purchase.item.icon] ?? Gift;
                return (
                  <div key={purchase.id} className="flex items-center gap-4 py-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                      <Icon className="size-4.5 text-accent-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{purchase.item.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {purchase.item.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="tabular flex items-center gap-1.5 rounded-full border border-currency/30 bg-currency/10 px-3 py-1 font-mono text-xs font-medium text-currency">
                        <Coins className="size-3.5" />
                        {purchase.item.cost}
                      </span>
                      <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                        {formatDate(purchase.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PurchaseConfirmDialog
        item={confirmItem}
        submitting={confirmItem !== null && purchasingId === confirmItem.id}
        onConfirm={() => confirmItem && handlePurchase(confirmItem)}
        onOpenChange={(open) => {
          if (!open) setConfirmItem(null);
        }}
      />
    </PageIn>
  );
}
