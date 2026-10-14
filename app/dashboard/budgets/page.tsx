"use client";

import * as React from "react";
import Link from "next/link";
import {
  PieChart,
  Calendar,
  Bell,
  PlusCircle,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Clock,
  Archive,
  Check,
  X,
  Repeat,
  ShieldCheck,
  TrendingDown,
  Info,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";
import { formatPaiseToINR } from "@/client/lib/utils";
import { BudgetProgress } from "@/server/models/budget";
import { RecurringDocument } from "@/server/models/recurring";
import { NotificationDocument } from "@/server/models/notification";

export default function BudgetsPage() {
  const [activeTab, setActiveTab] = React.useState<"budgets" | "recurring" | "notifications">("budgets");
  const [budgets, setBudgets] = React.useState<BudgetProgress[]>([]);
  const [recurringRules, setRecurringRules] = React.useState<RecurringDocument[]>([]);
  const [upcomingBills, setUpcomingBills] = React.useState<RecurringDocument[]>([]);
  const [totalUpcomingDue, setTotalUpcomingDue] = React.useState(0);
  const [notifications, setNotifications] = React.useState<NotificationDocument[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal States
  const [showAddBudget, setShowAddBudget] = React.useState(false);
  const [showAddRecurring, setShowAddRecurring] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Form States
  const [categoryName, setCategoryName] = React.useState("");
  const [budgetAmountInr, setBudgetAmountInr] = React.useState<number | "">("");
  const [alertThreshold, setAlertThreshold] = React.useState(85);

  const [merchantName, setMerchantName] = React.useState("");
  const [recurringAmountInr, setRecurringAmountInr] = React.useState<number | "">("");
  const [recurringFrequency, setRecurringFrequency] = React.useState<"monthly" | "quarterly" | "yearly" | "weekly">("monthly");
  const [nextExpectedDate, setNextExpectedDate] = React.useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [recurringCategory, setRecurringCategory] = React.useState("Bills & Utilities");

  // Fetch all data
  const fetchData = React.useCallback(async () => {
    try {
      const [bRes, rRes, nRes] = await Promise.all([
        fetch("/api/budgets"),
        fetch("/api/recurring"),
        fetch("/api/notifications"),
      ]);

      if (bRes.ok) {
        const bData = await bRes.json();
        setBudgets(bData.data?.budgets || []);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setRecurringRules(rData.data?.rules || []);
        setUpcomingBills(rData.data?.upcomingBills || []);
        setTotalUpcomingDue(rData.data?.totalUpcomingDuePaise || 0);
      }
      if (nRes.ok) {
        const nData = await nRes.json();
        setNotifications(nData.data?.notifications || []);
        setUnreadCount(nData.data?.unreadCount || 0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load budget and recurring data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create Budget
  async function handleCreateBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName || !budgetAmountInr) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryName,
          amountInr: Number(budgetAmountInr),
          alertThresholdPercent: alertThreshold,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create budget.");

      setShowAddBudget(false);
      setCategoryName("");
      setBudgetAmountInr("");
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to create budget.");
    } finally {
      setActionLoading(false);
    }
  }

  // Create Recurring Payment
  async function handleCreateRecurring(e: React.FormEvent) {
    e.preventDefault();
    if (!merchantName || !recurringAmountInr) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantName,
          amountInr: Number(recurringAmountInr),
          frequency: recurringFrequency,
          categoryName: recurringCategory,
          nextExpectedDate,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create recurring payment.");

      setShowAddRecurring(false);
      setMerchantName("");
      setRecurringAmountInr("");
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to create recurring payment.");
    } finally {
      setActionLoading(false);
    }
  }

  // Confirm or Dismiss Candidate
  async function handleUpdateRecurringStatus(ruleId: string, status: "active" | "dismissed") {
    try {
      const res = await fetch(`/api/recurring/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status.");
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to update status.");
    }
  }

  // Scan Candidates
  async function handleDetectCandidates() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recurring/detect", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Detection failed.");
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Detection failed.");
    } finally {
      setActionLoading(false);
    }
  }

  // Check & Evaluate Alerts
  async function handleEvaluateAlerts() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", { method: "POST" });
      if (!res.ok) throw new Error("Evaluation failed.");
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Evaluation failed.");
    } finally {
      setActionLoading(false);
    }
  }

  // Mark all notifications read
  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications/all/read", { method: "PATCH" });
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to mark all as read.");
    }
  }

  const candidateRules = recurringRules.filter((r) => r.status === "candidate");
  const activeRules = recurringRules.filter((r) => r.status === "active");

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center space-x-2 pt-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Budgets, Bills &amp; Alerts
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Proactive Guardian
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Set category spending limits, track upcoming recurring bills, and receive idempotent overspending alerts.
          </p>
        </div>

        {/* Global Action CTAs */}
        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEvaluateAlerts}
            disabled={actionLoading}
            className="text-xs font-semibold"
          >
            <Bell className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            Check Alerts {unreadCount > 0 && `(${unreadCount})`}
          </Button>

          {activeTab === "budgets" && (
            <Button
              size="sm"
              onClick={() => setShowAddBudget(true)}
              className="text-xs font-semibold shadow-xs"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> New Budget
            </Button>
          )}

          {activeTab === "recurring" && (
            <Button
              size="sm"
              onClick={() => setShowAddRecurring(true)}
              className="text-xs font-semibold shadow-xs"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Bill
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("budgets")}
          className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "budgets"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <PieChart className="mr-1.5 h-3.5 w-3.5" /> Monthly Budgets ({budgets.length})
        </button>

        <button
          onClick={() => setActiveTab("recurring")}
          className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "recurring"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Repeat className="mr-1.5 h-3.5 w-3.5" /> Recurring Bills &amp; Subscriptions
          {candidateRules.length > 0 && (
            <Badge variant="warning" className="ml-2 text-[10px] py-0 px-1.5">
              {candidateRules.length} Detected
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "notifications"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Bell className="mr-1.5 h-3.5 w-3.5" /> Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2 text-[10px] py-0 px-1.5">
              {unreadCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading budgets and subscription rules...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: Monthly Budgets */}
          {activeTab === "budgets" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgets.map((item) => {
                  const b = item.budget;
                  const isExceeded = item.status === "exceeded";
                  const isWarning = item.status === "warning";

                  const progressColor = isExceeded
                    ? "bg-rose-500"
                    : isWarning
                    ? "bg-amber-500"
                    : "bg-emerald-500";

                  return (
                    <Card key={b._id?.toString()} className="border-border shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-bold text-foreground">
                            {b.categoryName}
                          </CardTitle>
                          <Badge
                            variant={isExceeded ? "destructive" : isWarning ? "warning" : "outline"}
                            className="text-[10px]"
                          >
                            {isExceeded
                              ? "Exceeded"
                              : isWarning
                              ? `${item.utilizationPercent.toFixed(0)}% Warn`
                              : "On Track"}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          Limit: {formatPaiseToINR(b.amountPaise)} / month
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${progressColor} transition-all duration-500`}
                              style={{ width: `${Math.min(100, item.utilizationPercent)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-muted-foreground font-medium pt-0.5">
                            <span>Spent: {formatPaiseToINR(item.spentPaise)}</span>
                            <span>{item.utilizationPercent.toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* Remaining Headroom */}
                        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Remaining:</span>
                          <span className={`font-bold ${isExceeded ? "text-rose-600" : "text-foreground"}`}>
                            {isExceeded ? "₹0.00 (Over Budget)" : formatPaiseToINR(item.remainingPaise)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Recurring Bills & Subscriptions */}
          {activeTab === "recurring" && (
            <div className="space-y-6">
              {/* Upcoming Bills Strip */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Upcoming Bills (Next 15 Days)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {upcomingBills.length} scheduled payment{upcomingBills.length !== 1 ? "s" : ""} totaling{" "}
                      <span className="font-bold text-foreground">{formatPaiseToINR(totalUpcomingDue)}</span>
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDetectCandidates}
                  disabled={actionLoading}
                  className="text-xs font-semibold self-start sm:self-auto"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Scan Ledger for Subscriptions
                </Button>
              </div>

              {/* Detected Candidates Review Box */}
              {candidateRules.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <CardTitle className="text-sm font-bold text-foreground">
                        Detected Subscription Candidates ({candidateRules.length})
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      We noticed repeating transaction patterns. Confirm the ones you want PaisaPilot to track:
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {candidateRules.map((c) => (
                      <div
                        key={c._id?.toString()}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-background border border-border"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-xs text-foreground">
                              {c.merchantName}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {c.categoryName}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Expected: <strong className="text-foreground">{formatPaiseToINR(c.expectedAmountPaise)}</strong> • Monthly
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateRecurringStatus(c._id!.toString(), "active")}
                            className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 font-semibold"
                          >
                            <Check className="h-3 w-3 mr-1" /> Confirm
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateRecurringStatus(c._id!.toString(), "dismissed")}
                            className="text-xs h-7 px-2.5 text-muted-foreground hover:text-rose-600"
                          >
                            <X className="h-3 w-3 mr-1" /> Dismiss
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Confirmed Active Recurring Payments */}
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Active Recurring Payments</CardTitle>
                  <CardDescription className="text-xs">Subscriptions, rent, utility bills, and SIP investments</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {activeRules.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      No recurring payments confirmed yet. Click "Scan Ledger" or "Add Bill" to get started.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium uppercase">
                          <tr>
                            <th className="py-3 px-4">Merchant</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Frequency</th>
                            <th className="py-3 px-4">Next Due</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {activeRules.map((r) => (
                            <tr key={r._id?.toString()} className="hover:bg-muted/20">
                              <td className="py-3 px-4 font-semibold text-foreground">
                                {r.merchantName}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {r.categoryName}
                              </td>
                              <td className="py-3 px-4 capitalize text-muted-foreground">
                                {r.frequency}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap text-foreground font-medium">
                                {new Date(r.nextExpectedDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-foreground">
                                {formatPaiseToINR(r.expectedAmountPaise)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleUpdateRecurringStatus(r._id!.toString(), "dismissed")}
                                  className="text-muted-foreground hover:text-rose-600 transition-colors p-1"
                                  title="Stop tracking"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: Notifications & Idempotent Alerts */}
          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Proactive threshold alerts &amp; bill reminders (Zero duplicate spam guaranteed)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12 text-center space-y-2 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs">No notifications right now. Everything is healthy!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {notifications.map((n) => {
                    const isCritical = n.severity === "critical";
                    const isWarning = n.severity === "warning";

                    return (
                      <div
                        key={n._id?.toString()}
                        className={`p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                          !n.isRead
                            ? "bg-card border-border shadow-xs"
                            : "bg-muted/20 border-border/50 opacity-75"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="mt-0.5 shrink-0">
                            {isCritical ? (
                              <AlertCircle className="h-4 w-4 text-rose-600" />
                            ) : isWarning ? (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Info className="h-4 w-4 text-sky-500" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-foreground">
                              {n.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {n.message}
                            </p>
                            <span className="text-[10px] text-muted-foreground/75 block pt-1">
                              {new Date(n.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        {!n.isRead && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/notifications/${n._id!.toString()}/read`, {
                                method: "PATCH",
                              });
                              await fetchData();
                            }}
                            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground shrink-0 underline"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: New Budget */}
      {showAddBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Create Category Budget</h2>
              <button
                onClick={() => setShowAddBudget(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Entertainment, Shopping, Dining"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Monthly Limit (INR ₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={budgetAmountInr}
                  onChange={(e) => setBudgetAmountInr(e.target.value ? parseFloat(e.target.value) : "")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Alert Warning Threshold: {alertThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <span className="text-[11px] text-muted-foreground block">
                  You will receive an in-app warning notification when spending crosses this percentage.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddBudget(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading || !categoryName || !budgetAmountInr}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Create Budget
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Recurring Bill */}
      {showAddRecurring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Add Recurring Bill</h2>
              <button
                onClick={() => setShowAddRecurring(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateRecurring} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Merchant / Bill Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, Bescom Electricity, Rent"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Amount (INR ₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 649"
                    value={recurringAmountInr}
                    onChange={(e) => setRecurringAmountInr(e.target.value ? parseFloat(e.target.value) : "")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Frequency</label>
                  <select
                    value={recurringFrequency}
                    onChange={(e) => setRecurringFrequency(e.target.value as any)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <input
                    type="text"
                    required
                    value={recurringCategory}
                    onChange={(e) => setRecurringCategory(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Next Due Date</label>
                  <input
                    type="date"
                    required
                    value={nextExpectedDate}
                    onChange={(e) => setNextExpectedDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddRecurring(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading || !merchantName || !recurringAmountInr}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Track Recurring Bill
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

