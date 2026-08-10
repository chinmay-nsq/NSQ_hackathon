"use client";

import { useRef } from "react";
import {
  Coffee,
  Pizza,
  Shirt,
  Ticket,
  BookOpen,
  Home,
  Gift,
  Coins,
  Sparkle,
  Sprout,
  Music,
  Sunrise,
  Car,
  Gamepad2,
  Utensils,
  Sun,
  Headphones,
  CalendarHeart,
  type LucideIcon,
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import { MarketplaceItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  coffee: Coffee,
  pizza: Pizza,
  shirt: Shirt,
  ticket: Ticket,
  book: BookOpen,
  home: Home,
  gift: Gift,
  sparkle: Sparkle,
  sprout: Sprout,
  music: Music,
  sunrise: Sunrise,
  car: Car,
  gamepad: Gamepad2,
  utensils: Utensils,
  sun: Sun,
  headphones: Headphones,
  "calendar-heart": CalendarHeart,
};

const TILE_COLORS = ["#ff5a36", "#ffb35a", "#4ac4d9", "#9b5de5", "#e0655a", "#5a4ecb", "#e8622c"];

export function RewardTile({
  item,
  index,
  canAfford,
  coinsShort,
  redeeming,
  onRedeem,
  buttonRef,
}: {
  item: MarketplaceItem;
  index: number;
  canAfford: boolean;
  coinsShort: number;
  redeeming: boolean;
  onRedeem: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const Icon = ICONS[item.icon] ?? Gift;
  const color = TILE_COLORS[index % TILE_COLORS.length];
  const tileRef = useRef<HTMLDivElement>(null);
  const iconWrapRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tile = tileRef.current;
      const iconWrap = iconWrapRef.current;
      if (!tile || !iconWrap || !canAfford) return;

      const tl = gsap.timeline({ paused: true })
        .to(tile, { y: -10, scale: 1.04, duration: 0.3, ease: "power2.out" }, 0)
        .to(iconWrap, { rotate: -6, scale: 1.08, duration: 0.3, ease: "back.out(2)" }, 0);

      const onEnter = () => tl.play();
      const onLeave = () => tl.reverse();
      tile.addEventListener("mouseenter", onEnter);
      tile.addEventListener("mouseleave", onLeave);
      return () => {
        tile.removeEventListener("mouseenter", onEnter);
        tile.removeEventListener("mouseleave", onLeave);
      };
    },
    { scope: tileRef, dependencies: [canAfford] }
  );

  function handleClick() {
    if (!canAfford || redeeming) return;
    if (tileRef.current) {
      gsap.fromTo(
        tileRef.current,
        { scale: 1.04 },
        { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1, ease: "power1.inOut" }
      );
    }
    onRedeem();
  }

  return (
    <div
      ref={tileRef}
      className="reward-tile group/tile relative w-56 shrink-0 snap-center"
      style={{ opacity: canAfford ? 1 : 0.55 }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        disabled={!canAfford || redeeming}
        className={cn(
          "relative flex w-full flex-col items-center gap-4 rounded-3xl border px-6 py-8 text-center transition-colors",
          canAfford
            ? "cursor-pointer border-border bg-card hover:border-(--tile-color)"
            : "cursor-not-allowed border-border/60 bg-card/60"
        )}
        style={{ "--tile-color": color } as React.CSSProperties}
      >
        <div
          ref={iconWrapRef}
          className="flex size-20 items-center justify-center rounded-2xl"
          style={{
            background: `radial-gradient(circle at 35% 30%, color-mix(in oklch, ${color} 30%, transparent), color-mix(in oklch, ${color} 12%, transparent))`,
            boxShadow: canAfford ? `0 0 24px -4px color-mix(in oklch, ${color} 55%, transparent)` : undefined,
          }}
        >
          <Icon className="size-9" style={{ color }} strokeWidth={1.5} />
        </div>

        <div>
          <p className="font-display text-lg tracking-wide">{item.name}</p>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        </div>

        <div
          className="tabular flex items-center gap-1.5 rounded-full border border-currency/30 bg-currency/10 px-3 py-1 font-mono text-xs font-medium text-currency-foreground"
        >
          <Coins className="size-3.5 text-currency" />
          {item.cost}
        </div>

        <span
          className={cn(
            "font-mono text-[11px] tracking-widest uppercase",
            canAfford ? "text-foreground/70 group-hover/tile:text-(--tile-color)" : "text-muted-foreground/60"
          )}
        >
          {redeeming
            ? "Claiming…"
            : canAfford
              ? "Pull to claim"
              : `Need ${coinsShort.toLocaleString()} more coins`}
        </span>
      </button>
    </div>
  );
}
