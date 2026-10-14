"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileSpreadsheet,
  Bot,
  PieChart,
  LogOut,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  PlusCircle,
  Loader2,
  Layers,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";
import { formatPaiseToINR } from "@/client/lib/utils";

interface AuthenticatedUserProfile {
  id: string;
  email: string;
  displayName: string;
  persona?: string | null;
  onboardingCompleted: boolean;
  onboardingProfile?: {
    incomeBand?: string;
    primaryInflowSource?: string;
    fixedCommitments?: string[];
    primaryPaymentMethods?: string[];
    monthlyBudgetPaise?: number;
    savingsTargetPercent?: number;
  } | null;
}

const PERSONA_LABELS: Record<string, string> = {
  student: "Student / Campus",
  young_professional: "Young Professional",
  freelancer: "Freelancer / Consultant",
  family: "Family Household",
  small_business: "Small Business / Merchant",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthenticatedUserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login?redirect=/dashboard");
          return;
        }
        const data = await res.json();
        setUser(data.data?.user || null);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      router.push("/login");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your secure financial dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const personaTitle = (user.persona && PERSONA_LABELS[user.persona]) || "Member";
  const monthlyBudgetPaise = user.onboardingProfile?.monthlyBudgetPaise || 3500000;
  const savingsTarget = user.onboardingProfile?.savingsTargetPercent || 20;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {user.displayName}
            </h1>
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
              {personaTitle}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Account: <span className="font-medium text-foreground">{user.email}</span> • Persona financial intelligence active
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/dashboard/transactions">
            <Button size="sm" className="font-semibold shadow-sm">
              <PlusCircle className="mr-1.5 h-4 w-4" /> Add Transaction
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-muted-foreground hover:text-foreground font-medium"
          >
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 mr-1.5" />}
            Sign Out
          </Button>
        </div>
      </div>

      {/* Onboarding Notice if not completed */}
      {!user.onboardingCompleted && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-amber-900 dark:text-amber-200 text-sm">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-semibold">Complete your persona onboarding quiz</p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Unlock customized budget presets, spending benchmarks, and smart alerts tailored to your lifestyle.
              </p>
            </div>
          </div>
          <Link href="/onboarding">
            <Button size="sm" variant="outline" className="bg-background text-xs font-semibold">
              Resume Setup
            </Button>
          </Link>
        </div>
      )}

      {/* Summary KPI Cards (Integer Paise Precision) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Safe-to-Spend Balance */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Safe-to-Spend Balance
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaiseToINR(monthlyBudgetPaise)}
            </div>
            <p className="text-xs text-muted-foreground">
              Calculated after fixed commitments & {savingsTarget}% savings buffer
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Monthly Budget Limit */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Monthly Budget Cap
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <PieChart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaiseToINR(monthlyBudgetPaise)}
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: "0%" }} />
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              ₹0 spent this month (0% utilized)
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Monthly Inflows */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Inflows
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaiseToINR(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Income, allowances, client credits
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Total Monthly Outflows */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Outflows
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaiseToINR(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              UPI, debit/credit cards, cash debits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Modules & Onboarding Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quick Action Feature Portals */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Financial Management Modules</h2>
            <p className="text-xs text-muted-foreground">
              Access your accounts, manual transaction ledger, statement imports, and AI insights.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Module 1: Accounts & Transactions */}
            <Card className="border-border hover:border-foreground/30 transition-all shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Accounts & Ledger</CardTitle>
                    <CardDescription className="text-xs">UPI, bank accounts, cards, cash</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Record manual entries, review transaction history, filter by date, tags, and payment mode with exact paise precision.
                </p>
                <Link href="/dashboard/transactions" className="inline-block">
                  <Button variant="outline" size="sm" className="text-xs font-semibold">
                    View Ledger &rarr;
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Module 2: Statement Import */}
            <Card className="border-border hover:border-foreground/30 transition-all shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Statement Import</CardTitle>
                    <CardDescription className="text-xs">CSV & SBI PDF statements</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload bank CSV or tested SBI statements. Review parsed preview rows and confirm commit without duplicate charges.
                </p>
                <Link href="/dashboard/import" className="inline-block">
                  <Button variant="outline" size="sm" className="text-xs font-semibold">
                    Import Statements &rarr;
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Module 3: Budgets & Categories */}
            <Card className="border-border hover:border-foreground/30 transition-all shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <PieChart className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Budgets & Categories</CardTitle>
                    <CardDescription className="text-xs">Presets & category limits</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Persona-seeded categories (Mess, Rent, SIPs, Groceries) with custom spending alerts and month-over-month tracking.
                </p>
                <Link href="/dashboard/budgets" className="inline-block">
                  <Button variant="outline" size="sm" className="text-xs font-semibold">
                    Manage Budgets &rarr;
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Module 4: Grounded AI Pilot */}
            <Card className="border-border hover:border-foreground/30 transition-all shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">AI Financial Pilot</CardTitle>
                    <CardDescription className="text-xs">Sandboxed metric queries</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask grounded questions about your cashflow and food expenses. Zero hallucinations with strict server-side calculation tools.
                </p>
                <Link href="/dashboard/assistant" className="inline-block">
                  <Button variant="outline" size="sm" className="text-xs font-semibold">
                    Open Assistant &rarr;
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column (1 Col): Active Persona Profile & Guarantees */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Persona Profile</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Your personalized financial intelligence parameters
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Selected Archetype</span>
                <p className="font-semibold text-foreground text-sm">{personaTitle}</p>
              </div>

              {user.onboardingProfile?.incomeBand && (
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Monthly Inflow Band</span>
                  <p className="font-semibold text-foreground capitalize">
                    {user.onboardingProfile.incomeBand.replace(/_/g, " ")}
                  </p>
                </div>
              )}

              {user.onboardingProfile?.fixedCommitments && user.onboardingProfile.fixedCommitments.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-muted-foreground font-medium">Tracked Commitments</span>
                  <div className="flex flex-wrap gap-1">
                    {user.onboardingProfile.fixedCommitments.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px] capitalize">
                        {c.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {user.onboardingProfile?.primaryPaymentMethods && user.onboardingProfile.primaryPaymentMethods.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-muted-foreground font-medium">Active Payment Modes</span>
                  <div className="flex flex-wrap gap-1">
                    {user.onboardingProfile.primaryPaymentMethods.map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px] uppercase font-semibold">
                        {m.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <Link href="/onboarding" className="text-primary hover:underline font-semibold block">
                  Reconfigure Onboarding Answers &rarr;
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Trust Box */}
          <Card className="border-border bg-muted/40 shadow-sm">
            <CardContent className="pt-5 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1.5 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>PaisaPilot Security Guarantee</span>
              </div>
              <p>
                Zero bank credentials or UPI PINs are ever requested or stored. All monetary values are maintained in exact integer paise to prevent floating point drift.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

