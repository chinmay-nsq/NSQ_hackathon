"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const LINKS = [
  { href: "/", label: "The Kingdom" },
  { href: "/guilds", label: "Guilds" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/story", label: "Chronicle" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { employee, logout } = useAuthStore();

  return (
    <header className="border-b border-line bg-card/70 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-10">
          <Link href="/" className="font-display text-xl tracking-tight text-fg">
            Weatherline
          </Link>
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-2 text-sm transition-colors ${
                    active ? "text-accent" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-accent" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-5 text-sm">
          {employee && (
            <span className="text-fg-muted">
              {employee.name}
              <span className="mx-1.5 opacity-40">·</span>
              <span className="label-caps text-[11px] text-value">{employee.title}</span>
            </span>
          )}
          <button
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className="text-fg-muted hover:text-accent transition-colors label-caps text-[11px]"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
