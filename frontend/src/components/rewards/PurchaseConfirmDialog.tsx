"use client";

import { Coins, Gift } from "lucide-react";
import { MarketplaceItem } from "@/lib/types";
import { REWARD_ICONS } from "@/lib/rewardIcons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Confirms a reward redemption before it spends the employee's coins. */
export function PurchaseConfirmDialog({
  item,
  submitting,
  onConfirm,
  onOpenChange,
}: {
  item: MarketplaceItem | null;
  submitting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const Icon = item ? (REWARD_ICONS[item.icon] ?? Gift) : Gift;

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl tracking-wide uppercase">Confirm redemption</DialogTitle>
              <DialogDescription>
                This will spend your coins right away. Your manager will be notified once it&apos;s claimed.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent">
                <Icon className="size-5 text-accent-foreground" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              </div>
              <span className="tabular flex shrink-0 items-center gap-1.5 rounded-full border border-currency/30 bg-currency/10 px-3 py-1 font-mono text-xs font-medium text-currency">
                <Coins className="size-3.5" />
                {item.cost}
              </span>
            </div>

            <DialogFooter className="mt-4">
              <DialogClose
                render={
                  <Button
                    variant="outline"
                    disabled={submitting}
                    className="font-mono text-xs tracking-wide uppercase"
                  />
                }
              >
                Cancel
              </DialogClose>
              <Button
                disabled={submitting}
                className="glow-primary font-mono text-xs tracking-wide uppercase"
                onClick={onConfirm}
              >
                {submitting ? "Claiming…" : "Confirm & claim"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
