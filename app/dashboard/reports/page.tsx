"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Calendar,
  PieChart,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  FileSpreadsheet,
  FileCode,
  Loader2,
  Table,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";
import { formatPaiseToINR } from "@/client/lib/utils";
import {
  DashboardAnalyticsResult,
  AnalyticsPeriod,
} from "@/server/services/analytics.service";

export default function ReportsPage() {
  const [period, setPeriod] = React.useState<AnalyticsPeriod>("this_month");
  const [analytics, setAnalytics] = React.useState<DashboardAnalyticsResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Custom export dates
  const [exportStart, setExportStart] = React.useState<string>("");
  const [exportEnd, setExportEnd] = React.useState<string>("");

  const fetchReports = React.useCallback(async (p: AnalyticsPeriod) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/dashboard?period=${p}`);
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data || null);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReports(period);
  }, [period, fetchReports]);

  const m = analytics?.metrics;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Financial Analytics & Deep-Dive Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive P&L statements, category distribution matrices, and secure export tools.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-muted-foreground">Report Period:</span>
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
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Income
                </CardTitle>
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatPaiseToINR(m?.totalIncomePaise || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{analytics?.period.label}</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Expenses
                </CardTitle>
                <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatPaiseToINR(m?.totalExpensePaise || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {m?.transactionCount || 0} recorded transaction{m?.transactionCount === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Net Savings
                </CardTitle>
                <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <PieChart className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  (m?.netSavingsPaise || 0) >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400"
                }`}>
                  {formatPaiseToINR(m?.netSavingsPaise || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Savings Rate: <span className="font-semibold text-foreground">{m?.savingsRatePercent || 0}%</span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Internal Transfers
                </CardTitle>
                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {m?.transferCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Excluded from P&L to prevent double-counting
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Expenditure Matrix Table */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Category Expenditure Breakdown</CardTitle>
              <CardDescription className="text-xs">
                Detailed spend distribution, ticket size, and portfolio share
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!analytics?.categoryBreakdown || analytics.categoryBreakdown.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  No categorized expenses found in {analytics?.period.label}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-medium">
                      <tr>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Txn Count</th>
                        <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                        <th className="py-3 px-4 text-right">Avg Ticket Size (₹)</th>
                        <th className="py-3 px-4 text-right">Share of Outflows</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {analytics.categoryBreakdown.map((cat) => {
                        const avgPaise = Math.round(cat.amountPaise / (cat.transactionCount || 1));
                        return (
                          <tr key={cat.category} className="hover:bg-muted/20">
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {cat.category}
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground font-medium">
                              {cat.transactionCount}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-foreground">
                              {formatPaiseToINR(cat.amountPaise)}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground font-medium">
                              {formatPaiseToINR(avgPaise)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-primary">
                              {cat.percentage}%
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

          {/* Secure Export Center */}
          <Card className="border-border shadow-sm bg-gradient-to-br from-card to-muted/20">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Download className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">Data Export Center</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Download your complete financial records in machine-readable formats.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">From Date (Optional)</label>
                  <input
                    type="date"
                    value={exportStart}
                    onChange={(e) => setExportStart(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">To Date (Optional)</label>
                  <input
                    type="date"
                    value={exportEnd}
                    onChange={(e) => setExportEnd(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={`/api/analytics/export?format=csv${exportStart ? `&startDate=${exportStart}` : ""}${exportEnd ? `&endDate=${exportEnd}` : ""}`}
                  download
                >
                  <Button className="font-semibold text-xs shadow-sm">
                    <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Export Clean CSV
                  </Button>
                </a>

                <a
                  href={`/api/analytics/export?format=json${exportStart ? `&startDate=${exportStart}` : ""}${exportEnd ? `&endDate=${exportEnd}` : ""}`}
                  download
                >
                  <Button variant="outline" className="font-semibold text-xs shadow-sm">
                    <FileCode className="h-4 w-4 mr-1.5" /> Export Structured JSON
                  </Button>
                </a>
              </div>

              <div className="pt-2 flex items-center space-x-1.5 text-xs text-muted-foreground border-t border-border">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                <span>CSV Injection Protected: Special prefix characters (=, +, -, @) are automatically sanitized.</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

