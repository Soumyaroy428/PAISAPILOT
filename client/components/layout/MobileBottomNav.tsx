"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  UploadCloud,
  Sparkles,
  Target,
} from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();

  // Only render on dashboard routes
  if (!pathname || !pathname.startsWith("/dashboard")) {
    return null;
  }

  const navItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      label: "Ledger",
      href: "/dashboard/transactions",
      icon: CreditCard,
      active: pathname.startsWith("/dashboard/transactions"),
    },
    {
      label: "Import",
      href: "/dashboard/import",
      icon: UploadCloud,
      active: pathname.startsWith("/dashboard/import"),
    },
    {
      label: "Copilot",
      href: "/dashboard/assistant",
      icon: Sparkles,
      active: pathname.startsWith("/dashboard/assistant"),
    },
    {
      label: "Budgets",
      href: "/dashboard/budgets",
      icon: Target,
      active: pathname.startsWith("/dashboard/budgets"),
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-inset-bottom shadow-lg"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
                item.active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`flex items-center justify-center p-1 rounded-full transition-transform ${
                  item.active ? "bg-primary/10 scale-110" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
