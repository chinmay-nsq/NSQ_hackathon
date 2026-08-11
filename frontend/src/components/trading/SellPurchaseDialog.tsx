"use client";

import { useEffect, useState } from "react";
import { Tag, Gift, Coins } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { Purchase, MyListing } from "@/lib/types";
import { REWARD_ICONS } from "@/lib/rewardIcons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Lists one of the employee's own past purchases for resale — capped at what they originally paid. */
export function SellPurchaseDialog({
  myListings,
  onListed,
}: {
  myListings: MyListing[];
  onListed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [askingPrice, setAskingPrice] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api
      .get<{ purchases: Purchase[] }>("/marketplace/purchases/me")
      .then((data) => setPurchases(data.purchases))
      .catch(() => setPurchases([]))
      .finally(() => setPurchasesLoading(false));
  }, [open]);

  // A purchase already listed ACTIVE elsewhere can't be listed again.
  const activelyListedIds = new Set(
    myListings.filter((l) => l.status === "ACTIVE").map((l) => l.purchase.id)
  );
  const sellable = purchases.filter((p) => !activelyListedIds.has(p.id));
  const selected = sellable.find((p) => p.id === selectedId) ?? null;

  function reset() {
    setSelectedId(null);
    setAskingPrice(0);
    setError(null);
  }

  function selectPurchase(p: Purchase) {
    setSelectedId(p.id);
    setAskingPrice(p.item.cost);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Choose something to sell first.");
      return;
    }
    if (askingPrice < 1 || askingPrice > selected.item.cost) {
      setError(`Asking price must be between 1 and ${selected.item.cost} coins.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/trading", { purchaseId: selected.id, askingPrice });
      setOpen(false);
      reset();
      onListed();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create this listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPurchasesLoading(true);
        else reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="font-mono text-xs tracking-wide uppercase">
            <Tag />
            Sell something
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide uppercase">Sell a reward</DialogTitle>
            <DialogDescription>
              Pick something you&apos;ve already redeemed. You can ask for up to what you paid — never more.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="font-mono text-xs tracking-wide uppercase">What are you selling?</Label>
              {purchasesLoading ? (
                <p className="text-sm text-muted-foreground">Loading your purchases…</p>
              ) : sellable.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have anything to sell yet — redeem something from Rewards first.
                </p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-1.5">
                  {sellable.map((p) => {
                    const Icon = REWARD_ICONS[p.item.icon] ?? Gift;
                    const isSelected = selectedId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPurchase(p)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{p.item.name}</span>
                        <span className="tabular flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Coins className="size-3" />
                          {p.item.cost}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selected && (
              <div className="space-y-1.5">
                <Label htmlFor="asking-price" className="font-mono text-xs tracking-wide uppercase">
                  Asking price (max {selected.item.cost} coins)
                </Label>
                <Input
                  id="asking-price"
                  type="number"
                  min={1}
                  max={selected.item.cost}
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(Number(e.target.value))}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="submit"
              disabled={submitting || !selected}
              className="glow-primary font-mono text-xs tracking-wide uppercase"
            >
              {submitting ? "Listing…" : "List for sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
