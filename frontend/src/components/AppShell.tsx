"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useOnboardingTourStore } from "@/store/onboardingTourStore";
import { AppSidebar } from "@/components/AppSidebar";
import { CoinDisplay } from "@/components/CoinDisplay";
import { NotificationBell } from "@/components/NotificationBell";
import { CompanionChatBubble } from "@/components/CompanionChatBubble";
import { OnboardingTour } from "@/components/OnboardingTour";
import { TourStatusGate } from "@/components/TourStatusGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";

const PUBLIC_ROUTES = ["/", "/login", "/how-it-works", "/show-ppt"];
const ONBOARDING_ROUTE = "/onboarding";
const PROFILE_ROUTE = "/onboarding/profile";
const APP_HOME_ROUTE = "/app";
const FULL_ONBOARDING_ROUTES = [ONBOARDING_ROUTE, PROFILE_ROUTE];

/*
  Routes that get the shell's full width instead of the centred reading
  column. The task board is four columns of cards side by side — inside
  max-w-6xl each column lands near 260px, which wraps almost every card
  title and leaves a wide dead margin against the sidebar. Text-led pages
  keep the narrower column, where a full-width line would be hard to read.

  Only the max-width differs; the gutter itself is one value for every
  route, so a page never sits closer to the sidebar than its neighbours.
*/
const WIDE_ROUTES = ["/adventures"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, employee, fetchMe } = useAuthStore();
  const tourActive = useOnboardingTourStore((s) => s.active);
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isOnboardingRoute = FULL_ONBOARDING_ROUTES.includes(pathname);
  const isWideRoute = WIDE_ROUTES.includes(pathname);

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
      <>
        <TourStatusGate />
        <main className="bg-grid flex min-h-screen items-center justify-center gap-2.5 bg-background text-muted-foreground">
          <Sparkles className="size-4 animate-pulse text-primary" />
          <span className="font-display text-sm font-medium">Loading Skibidi-Sprint…</span>
        </main>
      </>
    );
  }

  if (status === "unauthenticated" || !employee) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-grid">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <CoinDisplay />
          <NotificationBell />
          <ThemeToggle />
        </header>
        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8">
          <div className={cn("w-full min-w-0", !isWideRoute && "mx-auto max-w-6xl")}>{children}</div>
        </main>
      </SidebarInset>
      {/* Managers have a hidden auto-provisioned companion (internal bookkeeping only, see CompanionService.autoProvisionHidden) — never shown as chat. */}
      {!tourActive && employee.role !== "MANAGER" && employee.role !== "ADMIN" && <CompanionChatBubble />}
      <OnboardingTour />
      <TourStatusGate />
    </SidebarProvider>
  );
}
