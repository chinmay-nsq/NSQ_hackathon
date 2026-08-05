"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, ApiRequestError } from "@/lib/api";
import { MarketplaceItem, Employee } from "@/lib/types";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { useAuthStore } from "@/store/authStore";

const ICONS: Record<string, string> = {
  coffee: "☕",
  pizza: "🍕",
  shirt: "👕",
  ticket: "🎟️",
  book: "📘",
  home: "🏡",
  gift: "🎁",
};

export default function MarketplacePage() {
  const { employee, fetchMe } = useAuthStore();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ items: MarketplaceItem[] }>("/marketplace/")
      .then((data) => setItems(data.items))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Failed to load marketplace"))
      .finally(() => setLoading(false));
  }, []);

  async function handlePurchase(item: MarketplaceItem) {
    setPurchasingId(item.id);
    setToast(null);
    try {
      await api.post<{ employee: Employee }>(`/marketplace/${item.id}/purchase`);
      await fetchMe();
      setToast(`Redeemed: ${item.name}`);
    } catch (err) {
      setToast(err instanceof ApiRequestError ? err.message : "That purchase didn't go through.");
    } finally {
      setPurchasingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="The Trading Post"
        title="Marketplace"
        description="Spend coin earned from completed adventures on rewards from the kingdom."
        action={
          employee && (
            <div className="text-right">
              <p className="label-caps text-[11px] text-fg-muted">Your Coin</p>
              <p className="tabular text-2xl text-value leading-tight">{employee.coins}</p>
            </div>
          )
        }
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="text-sm px-4 py-2.5 border border-accent/40 bg-accent/10 text-accent overflow-hidden"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <p className="text-fg-muted text-sm">Laying out the wares…</p>}
      {error && <p className="text-accent text-sm">{error}</p>}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const canAfford = (employee?.coins ?? 0) >= item.cost;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="h-full"
            >
              <Card className="flex flex-col h-full">
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{ICONS[item.icon] ?? "🎁"}</span>
                  <span className="tabular text-value text-sm">{item.cost}</span>
                </div>
                <h2 className="font-display text-lg mt-3">{item.name}</h2>
                <p className="text-sm text-fg-muted mt-1 flex-1">{item.description}</p>
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={!canAfford || purchasingId === item.id}
                  className="mt-5 w-full py-2 border border-accent text-accent text-sm label-caps text-[11px] hover:bg-accent hover:text-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-accent"
                >
                  {purchasingId === item.id ? "Redeeming…" : canAfford ? "Redeem" : "Not enough coin"}
                </button>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
