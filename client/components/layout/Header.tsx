"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  Menu,
  X,
  ShieldCheck,
  LayoutDashboard,
  CreditCard,
  UploadCloud,
  Building2,
  Target,
  TrendingUp,
  FileSpreadsheet,
  Sparkles,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { useRouter, usePathname } from "next/navigation";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [user, setUser] = React.useState<{ displayName?: string; email?: string } | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data?.user) {
          setUser(data.data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMobileMenuOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  const isDashboardRoute = pathname?.startsWith("/dashboard");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Paisa<span className="text-primary">Pilot</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {user && isDashboardRoute ? (
            <>
              <Link
                href="/dashboard"
                className={`transition-colors ${pathname === "/dashboard" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/transactions"
                className={`transition-colors ${pathname.startsWith("/dashboard/transactions") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Ledger
              </Link>
              <Link
                href="/dashboard/import"
                className={`transition-colors ${pathname.startsWith("/dashboard/import") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Import
              </Link>
              <Link
                href="/dashboard/budgets"
                className={`transition-colors ${pathname.startsWith("/dashboard/budgets") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Budgets
              </Link>
              <Link
                href="/dashboard/forecast"
                className={`transition-colors ${pathname.startsWith("/dashboard/forecast") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Forecast
              </Link>
              <Link
                href="/dashboard/assistant"
                className={`transition-colors flex items-center space-x-1 ${pathname.startsWith("/dashboard/assistant") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Copilot</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/features"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Features
              </Link>
              <Link
                href="/how-it-works"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                How It Works
              </Link>
              <Link
                href="/security"
                className="text-muted-foreground transition-colors hover:text-foreground flex items-center space-x-1"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Security</span>
              </Link>
              <Link
                href="/faq"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                FAQ
              </Link>
            </>
          )}
        </nav>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2">
              <Link href="/dashboard">
                <Button variant="primary" size="sm" className="font-semibold text-xs">
                  Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button variant="outline" size="sm" className="text-xs">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 pt-3 pb-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {user ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    {user.displayName || "Account"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                    {user.email}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-xs h-7 px-2.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                >
                  {loggingOut ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3 mr-1" />}
                  Logout
                </Button>
              </div>

              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Dashboard Modules
              </div>

              <nav className="grid grid-cols-1 gap-1 text-sm font-medium">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname === "/dashboard"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span>Overview & Metrics</span>
                </Link>

                <Link
                  href="/dashboard/transactions"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname.startsWith("/dashboard/transactions")
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <CreditCard className="h-4 w-4 shrink-0" />
                  <span>Transaction Ledger</span>
                </Link>

                <Link
                  href="/dashboard/import"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname.startsWith("/dashboard/import")
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <UploadCloud className="h-4 w-4 shrink-0" />
                  <span>Statement Import (CSV / PDF)</span>
                </Link>

                <Link
                  href="/dashboard/accounts"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname.startsWith("/dashboard/accounts")
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>Payment Accounts & Sources</span>
                </Link>

                <Link
                  href="/dashboard/budgets"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname.startsWith("/dashboard/budgets")
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Target className="h-4 w-4 shrink-0" />
                  <span>Budgets, Bills & Alerts</span>
                </Link>

                <Link
                  href="/dashboard/forecast"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname.startsWith("/dashboard/forecast")
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  <span>Cash Flow Forecast</span>
                </Link>

                <Link
                  href="/dashboard/reports"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname.startsWith("/dashboard/reports")
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 shrink-0" />
                  <span>Analytics & Reports</span>
                </Link>

                <Link
                  href="/dashboard/assistant"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname.startsWith("/dashboard/assistant")
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>AI Copilot</span>
                </Link>

                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    pathname.startsWith("/dashboard/settings")
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>Settings & Privacy</span>
                </Link>
              </nav>

              <div className="pt-2 border-t border-border flex flex-col space-y-1 text-xs text-muted-foreground">
                <Link
                  href="/security"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 px-2 hover:text-foreground"
                >
                  Security Guarantee
                </Link>
                <Link
                  href="/faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 px-2 hover:text-foreground"
                >
                  Help & FAQ
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <nav className="flex flex-col space-y-2 text-base font-medium">
                <Link
                  href="/features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Features
                </Link>
                <Link
                  href="/how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  How It Works
                </Link>
                <Link
                  href="/security"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center space-x-2"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Security & Privacy</span>
                </Link>
                <Link
                  href="/faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  FAQ
                </Link>
              </nav>

              <div className="pt-4 border-t border-border flex flex-col space-y-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

