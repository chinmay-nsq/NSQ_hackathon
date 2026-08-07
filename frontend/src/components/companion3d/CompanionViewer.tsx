"use client";

import Image from "next/image";
import { COMPANION_IMAGE_PATH, COMPANION_FALLBACK_COLOR } from "./companionAssets";
import { cn } from "@/lib/utils";

export function CompanionViewer({
  species,
  className = "",
  interactive = true,
}: {
  species: string;
  className?: string;
  interactive?: boolean;
}) {
  const src = COMPANION_IMAGE_PATH[species];
  const color = COMPANION_FALLBACK_COLOR[species] ?? "var(--primary)";

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-60 blur-2xl"
        style={{ background: `radial-gradient(circle, ${color}66, transparent 70%)` }}
      />
      {src ? (
        <Image
          src={src}
          alt={species}
          fill
          sizes="200px"
          className={cn(
            "relative object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]",
            interactive && "transition-transform duration-500 hover:scale-105"
          )}
        />
      ) : (
        <div
          className="relative size-2/3 rounded-full"
          style={{ background: color, boxShadow: `0 0 30px 6px ${color}66` }}
        />
      )}
    </div>
  );
}
