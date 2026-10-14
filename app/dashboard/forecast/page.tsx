"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Info,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Clock,
  Sparkles,
  Layers,
  Table as TableIcon,
  LineChart as ChartIcon,
  FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
  CashFlowForecastResult,
  ForecastHorizon,
  ForecastScenario,
} from "@/server/models/forecast";

export default function ForecastPage() {
  const [horizon, setHorizon] = React.useState<ForecastHorizon>(30);
  const [scenario, setScenario] = React.useState<ForecastScenario>("baseline");
  const [forecast, setForecast] = React.useState<CashFlowForecastResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showTable, setShowTable] = React.useState(false);

  const fetchForecast = React.useCallback(
    async (h: ForecastHorizon, s: ForecastScenario) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/forecast?horizon=${h}&scenario=${s}`);
        if (res.ok) {
          const json = await res.json();
          setForecast(json.data?.forecast || null);
        }
      } catch (err) {
        console.error("Failed to load forecast:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    fetchForecast(horizon, scenario);
  }, [horizon, scenario, fetchForecast]);

  const activeScenarioMetrics =
    scenario === "conservative"
      ? forecast?.scenarios.conservative
      : scenario === "optimistic"
      ? forecast?.scenarios.optimistic
      : forecast?.scenarios.baseline;

  // Chart data formatting in INR decimal
  const chartData = (forecast?.trajectory || []).map((pt) => ({
    date: new Date(pt.date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    }),
    Baseline: pt.baselinePaise / 100,
    Conservative: pt.conservativePaise / 100,
    Optimistic: pt.optimisticPaise / 100,
    events: pt.scheduledEvents,
  }));

  // Events with scheduled bills/inflow
  const milestoneEvents = (forecast?.trajectory || [])
    .filter((pt) => pt.scheduledEvents && pt.scheduledEvents.length > 0)
    .slice(0, 10);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Dashboard
            </Link>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-semibold text-primary">Forecasting</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Cash-Flow Forecasting &amp; Runway
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Deterministic mathematical modeling separating recurring commitments from variable burn.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Horizon Selector */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs">
            <span className="px-2 font-semibold text-muted-foreground">Horizon:</span>
            {[30, 60, 90].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h as ForecastHorizon)}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  horizon === h
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {h}D
              </button>
            ))}
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs">
            {(["baseline", "conservative", "optimistic"] as ForecastScenario[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScenario(s)}
                className={`px-3 py-1 font-semibold capitalize rounded-md transition-all ${
                  scenario === s
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Low-Data Alert Warning if user has few historical records */}
      {forecast?.isLowDataState && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-sm">Preliminary Heuristic Mode</div>
            <p className="leading-relaxed">
              You have analyzed only {forecast.dataPointsAnalyzed} recorded transactions across{" "}
              {forecast.historicalDaysAnalyzed} days. This forecast is currently using baseline
              heuristics from your onboarding profile. For high-confidence insights, import at least
              30 days of bank statements.
            </p>
            <div className="pt-1">
              <Link
                href="/dashboard/import"
                className="inline-flex items-center font-bold text-amber-700 dark:text-amber-300 hover:underline"
              >
                <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Import Statements &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Confidence & Coverage Notice Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-muted/30 border border-border text-xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-muted-foreground">
            Starting Balance:{" "}
            <span className="font-bold text-foreground">
              {formatPaiseToINR(forecast?.startingBalancePaise || 0)}
            </span>
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            Confidence:{" "}
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-bold tracking-wider ${
                forecast?.confidence === "high"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  : forecast?.confidence === "moderate"
                  ? "bg-sky-500/10 text-sky-600 border-sky-500/30"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
              }`}
            >
              {forecast?.confidence || "Estimating"}
            </Badge>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-muted-foreground">
          <span className="flex items-center space-x-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{forecast?.historicalDaysAnalyzed || 0} days analyzed</span>
          </span>
          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            className="font-medium text-primary hover:underline inline-flex items-center space-x-1"
          >
            {showTable ? <ChartIcon className="h-3 w-3 mr-1" /> : <TableIcon className="h-3 w-3 mr-1" />}
            <span>{showTable ? "View Chart" : "View Table"}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Projected End Balance */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Projected {horizon}D Balance
            </CardTitle>
            {(activeScenarioMetrics?.netChangePaise || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaiseToINR(activeScenarioMetrics?.endBalancePaise || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Net change:{" "}
              <span
                className={`font-semibold ${
                  (activeScenarioMetrics?.netChangePaise || 0) >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {(activeScenarioMetrics?.netChangePaise || 0) >= 0 ? "+" : ""}
                {formatPaiseToINR(activeScenarioMetrics?.netChangePaise || 0)}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Runway Projection */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estimated Runway
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {forecast?.metrics.runwayDays !== null && forecast?.metrics.runwayDays !== undefined
                ? `${forecast.metrics.runwayDays} Days`
                : "Sustainable"}
            </div>
            <p className="text-xs text-muted-foreground">
              {forecast?.metrics.runwayDays !== null
                ? "Until liquid balance reaches zero"
                : "Inflows exceed daily variable burn"}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Lowest Balance Milestone */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Lowest Projected Dip
            </CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaiseToINR(forecast?.metrics.lowestPoint.balancePaise || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Projected on{" "}
              {forecast?.metrics.lowestPoint.date
                ? new Date(forecast.metrics.lowestPoint.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })
                : "N/A"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Scheduled Commitments */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fixed Commitments
            </CardTitle>
            <Layers className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaiseToINR(forecast?.metrics.totalScheduledBillsPaise || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across active recurring subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Interactive Forecast Visualizer */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">
              Cash Flow Trajectory Simulation ({horizon} Days)
            </CardTitle>
            <CardDescription className="text-xs">
              Daily integer paise simulation comparing Baseline vs Conservative (+15% burn) vs
              Optimistic (-15% burn)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 pt-2 sm:pt-0">
            <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-primary mr-1.5" /> Baseline
            </span>
            <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 mr-1.5" /> Conservative
            </span>
            <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mr-1.5" /> Optimistic
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="h-72 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : showTable ? (
            /* Accessible Tabular View */
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Baseline</th>
                    <th className="py-2.5 px-4 text-right">Conservative</th>
                    <th className="py-2.5 px-4 text-right">Optimistic</th>
                    <th className="py-2.5 px-4">Scheduled Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {forecast?.trajectory.map((pt) => (
                    <tr key={pt.date} className="hover:bg-muted/20">
                      <td className="py-2 px-4 whitespace-nowrap font-medium text-foreground">
                        {new Date(pt.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className="py-2 px-4 text-right font-semibold text-foreground">
                        {formatPaiseToINR(pt.baselinePaise)}
                      </td>
                      <td className="py-2 px-4 text-right text-muted-foreground">
                        {formatPaiseToINR(pt.conservativePaise)}
                      </td>
                      <td className="py-2 px-4 text-right text-muted-foreground">
                        {formatPaiseToINR(pt.optimisticPaise)}
                      </td>
                      <td className="py-2 px-4 text-muted-foreground">
                        {pt.scheduledEvents.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Visualizer Chart */
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    minTickGap={20}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border border-border bg-background p-3 shadow-md text-xs space-y-1.5">
                          <div className="font-bold text-foreground">{label}</div>
                          <div className="space-y-1">
                            {payload.map((entry: any) => (
                              <div
                                key={entry.name}
                                className="flex items-center justify-between space-x-4"
                              >
                                <span className="text-muted-foreground">{entry.name}:</span>
                                <span className="font-bold text-foreground">
                                  {formatPaiseToINR(Math.round(entry.value * 100))}
                                </span>
                              </div>
                            ))}
                          </div>
                          {payload[0]?.payload?.events?.length > 0 && (
                            <div className="pt-1.5 border-t border-border text-[10px] text-primary">
                              Events: {payload[0].payload.events.join(", ")}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Baseline"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Conservative"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Optimistic"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lower Section (2 Columns): Upcoming Scheduled Milestones & Assumptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Scheduled Milestone Events */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Upcoming Milestones in This Horizon</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Recurring payments, subscriptions, and salary inflows occurring during the next{" "}
              {horizon} days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestoneEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No active recurring subscriptions or scheduled bills found in this horizon.
                <div className="pt-2">
                  <Link
                    href="/dashboard/budgets"
                    className="text-primary font-semibold hover:underline"
                  >
                    Add recurring subscriptions &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {milestoneEvents.map((pt) => (
                  <div
                    key={pt.date}
                    className="p-2.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground">
                        {pt.scheduledEvents.join(", ")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(pt.date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Day {pt.dayIndex}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Mathematical Assumptions & Disclosures */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Info className="h-4 w-4 text-sky-500" />
              <span>Methodology &amp; Mathematical Assumptions</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Transparent parameters driving the cash-flow projection engine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <ul className="space-y-2 list-disc pl-4 text-foreground/80">
              {(forecast?.assumptions || []).map((assump, idx) => (
                <li key={idx}>{assump}</li>
              ))}
            </ul>

            <div className="pt-3 border-t border-border">
              <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground flex items-center space-x-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Important Disclosure:</span>
                </span>
                <p>{forecast?.disclaimer}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
