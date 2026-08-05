"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { NavBar } from "@/components/NavBar";

const PUBLIC_ROUTES = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, fetchMe } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (status === "idle") {
      fetchMe();
    }
  }, [status, fetchMe]);

  useEffect(() => {
    if (status === "unauthenticated" && !isPublicRoute) {
      router.replace("/login");
    }
    if (status === "authenticated" && isPublicRoute) {
      router.replace("/");
    }
  }, [status, isPublicRoute, router]);

  if (isPublicRoute) {
    return <main className="flex-1">{children}</main>;
  }

  if (status === "idle" || status === "loading") {
    return (
      <main className="flex-1 flex items-center justify-center">
        <span className="font-display italic text-fg-muted">Unrolling the map…</span>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col">
      <NavBar />
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
