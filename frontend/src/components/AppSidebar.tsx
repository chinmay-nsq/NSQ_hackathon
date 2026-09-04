"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Users2,
  Store,
  TrendingUp,
  User,
  LogOut,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { taskWord, roleLabel } from "@/lib/taskLabels";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assignments", label: "Assignments", icon: ClipboardList, tourKey: "nav-assignments" },
  { href: "/standup", label: "Standup", icon: Users2 },
  { href: "/teams", label: "Teams", icon: Users, tourKey: "nav-teams" },
  // { href: "/company", label: "Company", icon: Sparkles }, // temporarily hidden
  { href: "/rewards", label: "Rewards", icon: Store, tourKey: "nav-rewards" },
  // Trading Post — removed entirely per backlog; kept here commented for a fast revert.
  // { href: "/trading", label: "Trading Post", icon: ArrowLeftRight, tourKey: "nav-trading" },
  { href: "/growth", label: "Growth", icon: TrendingUp, tourKey: "nav-growth" },
];

const MANAGER_NAV_ITEM = { href: "/approvals", label: "Approvals", icon: ClipboardCheck, tourKey: "nav-approvals" };
const ADMIN_NAV_ITEM = { href: "/admin", label: "Admin", icon: ShieldCheck };

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { employee, logout } = useAuthStore();
  const menuRef = useRef<HTMLUListElement>(null);

  const isManager = employee?.role === "MANAGER" || employee?.role === "ADMIN";

  const navItems = [
    // "Assignments" is renamed per role (Tasks for managers, Sprint for
    // everyone else — see taskLabels.ts); Rewards is hidden for managers.
    ...NAV_ITEMS.filter((item) => !(isManager && item.href === "/rewards")).map((item) =>
      item.href === "/assignments" ? { ...item, label: taskWord(employee?.role) } : item
    ),
    ...(isManager ? [MANAGER_NAV_ITEM] : []),
    ...(employee?.role === "ADMIN" ? [ADMIN_NAV_ITEM] : []),
  ];

  useGSAP(
    () => {
      if (!menuRef.current) return;
      const items = menuRef.current.querySelectorAll("li");
      gsap.fromTo(
        items,
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", stagger: 0.05, delay: 0.1 }
      );
    },
    { scope: menuRef }
  );

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="size-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-border">
            <Image src="/icon.svg" alt="" width={32} height={32} className="size-full" />
          </div>
          <span className="font-display text-[15px] font-bold">Skibidi-Sprint</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-[0.12em] uppercase">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu ref={menuRef}>
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
                      render={
                        <Link href={item.href} data-tour={"tourKey" in item ? item.tourKey : undefined}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2">
        {employee && (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials(employee.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{employee.name}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel(employee.role)}</p>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/profile"}
              render={
                <Link href="/profile">
                  <User />
                  <span>Profile</span>
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
