"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";

const PUBLIC_ROUTES = ["/", "/login"];
const ONBOARDING_ROUTE = "/onboarding";
const APP_HOME_ROUTE = "/app";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, employee, fetchMe } = useAuthStore();
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
    if (status === "authenticated" && employee?.companion && pathname === ONBOARDING_ROUTE) {
      router.replace(APP_HOME_ROUTE);
    }
  }, [status, employee, isPublicRoute, pathname, router]);

  if (isPublicRoute || pathname === ONBOARDING_ROUTE) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (status === "idle" || status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Sparkles className="size-4 animate-pulse" />
        <span className="text-sm">Loading Weatherline…</span>
      </main>
    );
  }

  if (status === "unauthenticated" || !employee) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 p-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
