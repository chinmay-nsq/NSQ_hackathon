"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { CoinDisplay } from "@/components/CoinDisplay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";

const PUBLIC_ROUTES = ["/", "/login"];
const ONBOARDING_ROUTE = "/onboarding";
const PROFILE_ROUTE = "/onboarding/profile";
const APP_HOME_ROUTE = "/app";
const FULL_ONBOARDING_ROUTES = [ONBOARDING_ROUTE, PROFILE_ROUTE];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, employee, fetchMe } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isOnboardingRoute = FULL_ONBOARDING_ROUTES.includes(pathname);

  useEffect(() => {
    if (status === "idle") {
      fetchMe();
    }
  }, [status, fetchMe]);

  useEffect(() => {
    if (status === "unauthenticated" && !isPublicRoute) {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && pathname === "/login") {
      router.replace(APP_HOME_ROUTE);
      return;
    }
    if (status === "authenticated" && employee && !employee.companion && pathname !== ONBOARDING_ROUTE) {
      router.replace(ONBOARDING_ROUTE);
      return;
    }
    if (
      status === "authenticated" &&
      employee?.companion &&
      !employee.profileCompletedAt &&
      pathname !== PROFILE_ROUTE
    ) {
      router.replace(PROFILE_ROUTE);
      return;
    }
    if (
      status === "authenticated" &&
      employee?.companion &&
      employee.profileCompletedAt &&
      isOnboardingRoute
    ) {
      router.replace(APP_HOME_ROUTE);
    }
  }, [status, employee, isPublicRoute, isOnboardingRoute, pathname, router]);

  if (isPublicRoute || isOnboardingRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (status === "idle" || status === "loading") {
    return (
      <main className="bg-grid flex min-h-screen items-center justify-center gap-2.5 bg-background text-muted-foreground">
        <Sparkles className="size-4 animate-pulse text-primary" />
        <span className="font-display text-sm tracking-wide uppercase">Loading Weatherline…</span>
      </main>
    );
  }

  if (status === "unauthenticated" || !employee) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-grid">
        <header className="bg-background/80 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <CoinDisplay />
          <ThemeToggle />
        </header>
        <main className="min-w-0 flex-1 p-6">
          <div className="mx-auto w-full min-w-0 max-w-6xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
