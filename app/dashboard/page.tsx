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
  Calendar,
  AlertCircle,
  PlusCircle,
  Loader2,
  Download,
  Table,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Tag,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";
import { formatPaiseToINR } from "@/client/lib/utils";
import {
  DashboardAnalyticsResult,
  AnalyticsPeriod,
} from "@/server/services/analytics.service";

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
  const [analytics, setAnalytics] = React.useState<DashboardAnalyticsResult | null>(null);
  const [period, setPeriod] = React.useState<AnalyticsPeriod>("this_month");
  const [loading, setLoading] = React.useState(true);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);
  const [showAccessibleTable, setShowAccessibleTable] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  // Fetch authenticated user
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

  // Fetch analytics for selected period
  const fetchAnalytics = React.useCallback(async (p: AnalyticsPeriod) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/analytics/dashboard?period=${p}`);
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data || null);
      }
    } catch (err) {
      console.error("Failed to load dashboard analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user) {
      fetchAnalytics(period);
    }
  }, [user, period, fetchAnalytics]);

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

  if (!user) return null;

  const personaTitle = (user.persona && PERSONA_LABELS[user.persona]) || "Member";
  const m = analytics?.metrics;

  const budgetPaise = m?.monthlyBudgetPaise || 3500000;
  const expensePaise = m?.totalExpensePaise || 0;
  const budgetUtilization = m?.budgetUtilizationPercent || 0;
  const isBudgetExceeded = budgetUtilization > 100;
  const isBudgetWarning = budgetUtilization > 80 && !isBudgetExceeded;

  // Chart data formatting in INR decimal
  const chartData = (analytics?.trends || []).map((t) => ({
    date: new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    Income: t.incomePaise / 100,
    Expenses: t.expensePaise / 100,
  }));

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
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
            Account: <span className="font-medium text-foreground">{user.email}</span> • Single source of truth calculation engine active
          </p>
        </div>

        {/* Global Action CTAs */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link href="/dashboard/assistant">
            <Button size="sm" variant="outline" className="font-semibold text-xs border-primary/30 text-primary hover:bg-primary/5 shadow-2xs">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Copilot
            </Button>
          </Link>
          <Link href="/dashboard/transactions">
            <Button size="sm" className="font-semibold shadow-sm text-xs">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Txn
            </Button>
          </Link>
          <a href="/api/analytics/export?format=csv" download>
            <Button variant="outline" size="sm" className="font-semibold text-xs">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>
          </a>
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

      {/* Period Filter & Coverage Disclosure */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/30 p-3 rounded-xl border border-border">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-foreground">Time Period:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="last_90_days">Last 90 Days</option>
            <option value="this_year">This Year</option>
            <option value="all_time">All Time</option>
          </select>
          {analyticsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-1" />}
        </div>

        {/* Data Coverage Notice */}
        <div className="text-xs text-muted-foreground flex items-center space-x-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            {analytics?.dataCoverage.totalHistoricalCount ? (
              <>
                Active Data Scope:{" "}
                <span className="font-medium text-foreground">
                  {analytics.dataCoverage.firstTransactionDate || "N/A"}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                  {analytics.dataCoverage.lastTransactionDate || "N/A"}
                </span>{" "}
                ({analytics.dataCoverage.totalHistoricalCount} total records)
              </>
            ) : (
              "No historical transactions recorded yet"
            )}
          </span>
        </div>
      </div>

      {/* Summary KPI Cards (Strict Integer Paise Arithmetic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Reconciled Balance */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Reconciled Balance
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaiseToINR(m?.reconciledBalancePaise || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sum across all active payment sources
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Period Total Inflows */}
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
              {formatPaiseToINR(m?.totalIncomePaise || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Salary, client credits, allowances
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Period Total Outflows */}
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
              {formatPaiseToINR(m?.totalExpensePaise || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              UPI debits, card payments, bills
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Net Savings & Savings Rate */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Net Savings & Rate
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <PieChart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className={`text-2xl font-bold tracking-tight ${
              (m?.netSavingsPaise || 0) >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400"
            }`}>
              {formatPaiseToINR(m?.netSavingsPaise || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Savings rate: <span className="font-semibold text-foreground">{m?.savingsRatePercent || 0}%</span> of period income
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Utilization Banner */}
      <Card className={`border shadow-sm ${
        isBudgetExceeded
          ? "border-rose-500/40 bg-rose-500/5"
          : isBudgetWarning
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border"
      }`}>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly Target Budget Cap
              </span>
              {isBudgetExceeded ? (
                <Badge variant="destructive" className="text-[10px]">Over Budget</Badge>
              ) : isBudgetWarning ? (
                <Badge variant="warning" className="text-[10px]">80%+ Cap Warning</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Within Limit</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{formatPaiseToINR(expensePaise)}</span> spent of{" "}
              <span className="font-bold text-foreground">{formatPaiseToINR(budgetPaise)}</span> ({budgetUtilization}% utilized)
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isBudgetExceeded
                  ? "bg-rose-500"
                  : isBudgetWarning
                  ? "bg-amber-500"
                  : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, budgetUtilization)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid: Cash Flow Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Cash Flow Trend Chart with Accessible Alternative */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Cash Flow Trends</CardTitle>
              <CardDescription className="text-xs">
                Inflows (Credits) vs Outflows (Debits) over the selected period
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAccessibleTable(!showAccessibleTable)}
              className="text-xs h-7"
            >
              {showAccessibleTable ? <BarChart3 className="h-3.5 w-3.5 mr-1" /> : <Table className="h-3.5 w-3.5 mr-1" />}
              {showAccessibleTable ? "Show Chart" : "Table View"}
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-center">
                <div className="space-y-2">
                  <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">No transaction data recorded for this time window.</p>
                </div>
              </div>
            ) : showAccessibleTable ? (
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-medium">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Income (₹)</th>
                      <th className="py-2 px-3 text-right">Expenses (₹)</th>
                      <th className="py-2 px-3 text-right">Net (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analytics?.trends.map((t) => (
                      <tr key={t.date}>
                        <td className="py-2 px-3 font-medium">{t.date}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{formatPaiseToINR(t.incomePaise)}</td>
                        <td className="py-2 px-3 text-right text-foreground font-semibold">{formatPaiseToINR(t.expensePaise)}</td>
                        <td className={`py-2 px-3 text-right font-bold ${t.netPaise >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatPaiseToINR(t.netPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, ""]}
                      contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right (1 Col): Category Spending Breakdown */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Spending by Category</CardTitle>
            <CardDescription className="text-xs">
              Distribution of expenses across categories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {!analytics?.categoryBreakdown || analytics.categoryBreakdown.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-center">
                <p className="text-xs text-muted-foreground">No categorized expenses in this period.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {analytics.categoryBreakdown.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{cat.category}</span>
                      <span className="font-bold text-foreground">
                        {formatPaiseToINR(cat.amountPaise)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Management Portals */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Financial Management Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Module 1: Transactions Ledger */}
          <Card className="border-border hover:border-foreground/30 transition-all shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CreditCard className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Transaction Ledger</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Manual entries, UPI tags, date filters, and exact paise ledger.</p>
              <Link href="/dashboard/transactions" className="inline-block text-primary font-semibold hover:underline">
                Open Ledger &rarr;
              </Link>
            </CardContent>
          </Card>

          {/* Module 2: Statement Import */}
          <Card className="border-border hover:border-foreground/30 transition-all shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Statement Import</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>CSV &amp; SBI PDF statements with candidate preview &amp; duplicate defense.</p>
              <Link href="/dashboard/import" className="inline-block text-primary font-semibold hover:underline">
                Import Statements &rarr;
              </Link>
            </CardContent>
          </Card>

          {/* Module 3: Accounts & Payment Sources */}
          <Card className="border-border hover:border-foreground/30 transition-all shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Wallet className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Payment Accounts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Manage bank accounts, UPI handles, cards, and physical cash liquidity.</p>
              <Link href="/dashboard/accounts" className="inline-block text-primary font-semibold hover:underline">
                Manage Accounts &rarr;
              </Link>
            </CardContent>
          </Card>

          {/* Module 4: Categories & Intelligence */}
          <Card className="border-border hover:border-foreground/30 transition-all shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Tag className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Categories &amp; Rules</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Taxonomy, custom tags, and Indian merchant auto-matching rules.</p>
              <Link href="/dashboard/categories" className="inline-block text-primary font-semibold hover:underline">
                Manage Tags &rarr;
              </Link>
            </CardContent>
          </Card>

          {/* Module 5: Reports & Analytics */}
          <Card className="border-border hover:border-foreground/30 transition-all shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <PieChart className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Deep Dive Reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Monthly P&amp;L, spending trends, and secure CSV/JSON export center.</p>
              <Link href="/dashboard/reports" className="inline-block text-primary font-semibold hover:underline">
                View Reports &rarr;
              </Link>
            </CardContent>
          </Card>

          {/* Module 6: Grounded AI Assistant */}
          <Card className="border-border hover:border-foreground/30 transition-all shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Bot className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">AI Copilot</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Affordability check, savings insights, and grounded financial intelligence.</p>
              <Link href="/dashboard/assistant" className="inline-block text-primary font-semibold hover:underline">
                Ask Copilot &rarr;
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <CardDescription className="text-xs">Latest recorded transactions</CardDescription>
          </div>
          <Link href="/dashboard/transactions" className="text-xs font-semibold text-primary hover:underline">
            View All Ledger &rarr;
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {!analytics?.recentTransactions || analytics.recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No recent transactions recorded in this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Account</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics.recentTransactions.map((tx) => {
                    const isIncome = tx.type === "income";
                    return (
                      <tr key={tx._id?.toString()} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 whitespace-nowrap font-medium text-foreground">
                          {new Date(tx.transactionDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          {tx.description}
                          {tx.categoryName && (
                            <Badge variant="outline" className="text-[10px] ml-2">
                              {tx.categoryName}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {tx.accountName || "Unassigned"}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-bold ${
                          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                        }`}>
                          {isIncome ? "+" : "-"}
                          {formatPaiseToINR(tx.amountPaise)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
