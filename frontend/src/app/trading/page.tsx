"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Coins, ShoppingBag, History, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiRequestError } from "@/lib/api";
import { Listing, MyListing } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { PageIn } from "@/components/motion/PageIn";
import { CountUp } from "@/components/motion/CountUp";
import { REWARD_ICONS } from "@/lib/rewardIcons";
import { SellPurchaseDialog } from "@/components/trading/SellPurchaseDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: MyListing["status"]) {
  switch (status) {
    case "ACTIVE":
      return "border-primary/40 text-primary";
    case "SOLD":
      return "border-success/40 text-success";
    default:
      return "border-border text-muted-foreground";
  }
}

export default function TradingPage() {
  const { employee, fetchMe } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api.get<{ listings: Listing[] }>("/trading/"),
      api.get<{ listings: MyListing[] }>("/trading/mine"),
    ])
      .then(([browse, mine]) => {
        setListings(browse.listings);
        setMyListings(mine.listings);
      })
      .catch(() => {
        setListings([]);
        setMyListings([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleBuy(listing: Listing) {
    setBuyingId(listing.id);
    try {
      await api.post(`/trading/${listing.id}/buy`);
      toast.success(`Bought ${listing.purchase.item.name}`);
      load();
      void fetchMe();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "That purchase didn't go through.");
    } finally {
      setBuyingId(null);
    }
  }

  async function handleCancel(listing: MyListing) {
    setCancellingId(listing.id);
    try {
      await api.post(`/trading/${listing.id}/cancel`);
      toast.success("Listing cancelled");
      load();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't cancel this listing.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <PageIn>
      <PageHeader
        title="Trading Post"
        description="Sell rewards you've already redeemed to other employees — never for more than you paid."
        action={
          <div className="flex items-center gap-3">
            {employee && (
              <div
                data-coin-target
                className="glow-primary flex items-center gap-2 rounded-full border border-currency/30 bg-currency/10 px-4 py-1.5"
              >
                <Coins className="size-4 text-currency" />
                <span className="tabular font-mono font-medium">
                  <CountUp value={employee.coins} />
                </span>
              </div>
            )}
            <SellPurchaseDialog myListings={myListings} onListed={load} />
          </div>
        }
      />

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl tracking-wide uppercase">
          <ShoppingBag className="size-4.5 text-muted-foreground" />
          For sale ({listings.length})
        </h2>

        {loading ? (
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-72 shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing&apos;s up for trade right now. Check back later, or list something yourself.
          </p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {listings.map((listing) => {
              const Icon = REWARD_ICONS[listing.purchase.item.icon] ?? Gift;
              const canAfford = (employee?.coins ?? 0) >= listing.askingPrice;
              return (
                <div
                  key={listing.id}
                  className="flex w-72 flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent">
                      <Icon className="size-5 text-accent-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{listing.purchase.item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        sold by {listing.seller.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="tabular flex items-center gap-1.5 rounded-full border border-currency/30 bg-currency/10 px-3 py-1 font-mono text-xs font-medium text-currency">
                      <Coins className="size-3.5 text-currency" />
                      {listing.askingPrice}
                    </span>
                    <Button
                      size="sm"
                      disabled={!canAfford || buyingId === listing.id}
                      onClick={() => handleBuy(listing)}
                      className="font-mono text-xs tracking-wide uppercase"
                    >
                      {buyingId === listing.id ? "Buying…" : canAfford ? "Buy" : "Can't afford"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl tracking-wide uppercase">
          <History className="size-4.5 text-muted-foreground" />
          Your listings ({myListings.length})
        </h2>

        {loading ? (
          <div className="space-y-px">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : myListings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t listed anything yet — sell something you&apos;ve redeemed above.
          </p>
        ) : (
          <div className="divide-y divide-border/60 border-t border-border/60">
            {myListings.map((listing) => {
              const Icon = REWARD_ICONS[listing.purchase.item.icon] ?? Gift;
              return (
                <div key={listing.id} className="flex items-center gap-4 py-4">
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback className="font-display bg-accent text-accent-foreground">
                      <Icon className="size-4.5" strokeWidth={1.5} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{listing.purchase.item.name}</p>
                      <Badge
                        variant="outline"
                        className={cn("font-mono text-[10px] tracking-wide uppercase", statusBadgeClass(listing.status))}
                      >
                        {listing.status}
                      </Badge>
                    </div>
                    <span className="tabular mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Coins className="size-3" />
                      {listing.askingPrice} coins
                    </span>
                  </div>
                  {listing.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={cancellingId === listing.id}
                      onClick={() => handleCancel(listing)}
                      className="font-mono text-xs tracking-wide uppercase text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" />
                      {cancellingId === listing.id ? "Cancelling…" : "Cancel"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageIn>
  );
}
