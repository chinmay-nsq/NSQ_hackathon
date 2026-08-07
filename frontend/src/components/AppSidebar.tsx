"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap/registerPlugins";
import {
  LayoutDashboard,
  Swords,
  Users,
  Store,
  Newspaper,
  User,
  LogOut,
  Sparkles,
  Moon,
  Sun,
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

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/adventures", label: "Adventures", icon: Swords },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/company", label: "Company", icon: Sparkles },
  { href: "/rewards", label: "Rewards", icon: Store },
  { href: "/recap", label: "Weekly Recap", icon: Newspaper },
];

const MANAGER_NAV_ITEM = { href: "/approvals", label: "Approvals", icon: ClipboardCheck };
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
  const { resolvedTheme, setTheme } = useTheme();
  const menuRef = useRef<HTMLUListElement>(null);

  const navItems = [
    ...NAV_ITEMS,
    ...(employee?.role === "MANAGER" || employee?.role === "ADMIN" ? [MANAGER_NAV_ITEM] : []),
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
          <div className="glow-primary flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="font-display text-base tracking-wide uppercase">Weatherline</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-[0.15em] uppercase">
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
                      className="data-[active=true]:glow-primary data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium"
                      render={
                        <Link href={item.href}>
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
              <p className="truncate text-xs text-muted-foreground">{employee.title}</p>
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
            <SidebarMenuButton onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
              <span>{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
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
