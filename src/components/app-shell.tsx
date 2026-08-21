"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNav } from "@/components/nav";
import { NetworkStatusBadge } from "@/components/network-status-badge";
import { NetworkProvider } from "@/components/providers/network-provider";
import { PwaRegister } from "@/components/providers/pwa-register";
import type { BusinessRole } from "@/lib/supabase/types";
import { canAccessPath } from "@/lib/role-access";

function isActive(pathname: string, href: string) {
  if (href === "/more") return pathname.startsWith("/more");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  businessName,
  businessId,
  locationId,
  role,
  onSignOut,
  children,
}: {
  businessName: string;
  businessId: string;
  locationId: string;
  role: BusinessRole;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const visibleNav = primaryNav.filter((item) => canAccessPath(role, item.href));

  return (
    <NetworkProvider businessId={businessId} locationId={locationId}>
      <PwaRegister />
      <div className="flex min-h-dvh flex-col md:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex print:hidden">
          <div className="px-5 py-5">
            <p className="text-lg font-bold text-primary">Kompass POS</p>
            <p className="mt-0.5 truncate text-xs text-text-secondary">{businessName}</p>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {visibleNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-primary-light text-primary-dark" : "text-text-secondary hover:bg-primary-light/50",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-3">
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-primary-light/50"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-h-dvh flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-6 print:hidden">
            <p className="text-sm font-semibold md:hidden">{businessName}</p>
            <div className="hidden md:block" />
            <NetworkStatusBadge />
          </header>

          <main className="flex-1 overflow-y-auto pb-20 md:pb-6">{children}</main>

          {/* Mobile bottom nav */}
          <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface md:hidden print:hidden">
            {visibleNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
                    active ? "text-primary" : "text-text-secondary",
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </NetworkProvider>
  );
}
