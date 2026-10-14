"use client";

import * as React from "react";
import Link from "next/link";
import {
  Tag,
  PlusCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Archive,
  CheckCircle2,
  Sparkles,
  Info,
  TrendingDown,
  TrendingUp,
  Layers,
  Search,
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
import { CategoryDocument, CategoryKind } from "@/server/models/category";

const PRESET_COLORS = [
  "#f97316", // Orange
  "#10b981", // Emerald
  "#0ea5e9", // Sky Blue
  "#6366f1", // Indigo
  "#eab308", // Amber
  "#ec4899", // Pink
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#14b8a6", // Teal
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#64748b", // Slate
];

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<CategoryDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [autoCategorizing, setAutoCategorizing] = React.useState(false);
  const [autoCatResult, setAutoCatResult] = React.useState<{
    totalChecked: number;
    totalCategorized: number;
    categorizedBreakdown: Record<string, number>;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"all" | "expense" | "income">("all");

  // Form State
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<CategoryKind>("expense");
  const [color, setColor] = React.useState(PRESET_COLORS[0]);

  const fetchCategories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories.");
      const data = await res.json();
      setCategories(data.data?.categories || []);
    } catch (err: any) {
      setError(err.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind,
          color,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create category.");
      }

      setShowAddModal(false);
      setName("");
      setKind("expense");
      setColor(PRESET_COLORS[0]);
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || "Failed to create category.");
    } finally {
      setCreating(false);
    }
  }

  async function handleArchiveCategory(id: string, catName: string) {
    if (!confirm(`Are you sure you want to archive "${catName}"? Existing transactions will retain their historical category.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to archive category.");
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || "Failed to archive category.");
    }
  }

  async function handleRunAutoCategorization() {
    setAutoCategorizing(true);
    setError(null);
    setAutoCatResult(null);

    try {
      const res = await fetch("/api/categories/auto-categorize", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Auto-categorization failed.");
      }

      setAutoCatResult(data.data);
    } catch (err: any) {
      setError(err.message || "Failed to run auto-categorization.");
    } finally {
      setAutoCategorizing(false);
    }
  }

  // Filtered categories
  const filteredCategories = categories.filter((cat) => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      cat.kind === activeTab ||
      cat.kind === "both";
    return matchesSearch && matchesTab;
  });

  const expenseCount = categories.filter((c) => c.kind === "expense" || c.kind === "both").length;
  const incomeCount = categories.filter((c) => c.kind === "income" || c.kind === "both").length;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Nav */}
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
              Categories & Intelligence
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Taxonomy Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage spending taxonomy, customize tags, and run deterministic Indian merchant auto-matching.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunAutoCategorization}
            disabled={autoCategorizing}
            className="font-semibold shadow-sm text-xs h-8"
          >
            {autoCategorizing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            )}
            Auto-Categorize Unassigned
          </Button>

          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="font-semibold shadow-sm text-xs h-8"
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Category
          </Button>
        </div>
      </div>

      {/* Error Banner */}
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

      {/* Auto Categorization Result Banner */}
      {autoCatResult && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Auto-Categorization Complete
                </h3>
              </div>
              <button
                onClick={() => setAutoCatResult(null)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Evaluated <span className="font-bold text-foreground">{autoCatResult.totalChecked}</span> unassigned transactions. Successfully categorized <span className="font-bold text-emerald-600 dark:text-emerald-400">{autoCatResult.totalCategorized}</span> transactions with deterministic merchant rules.
            </p>
            {Object.keys(autoCatResult.categorizedBreakdown).length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {Object.entries(autoCatResult.categorizedBreakdown).map(([cat, count]) => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cat}: +{count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Categories
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {categories.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active taxonomy entries
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Expense Categories
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {expenseCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Food, commute, bills, shopping, rent
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Income Categories
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {incomeCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Salary, business, client consulting
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rule Notice */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-start space-x-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Deterministic Rule Engine &amp; User Confirmation Safety
          </p>
          <p>
            PaisaPilot detects over 100+ Indian merchant UPI handles, merchant IDs, and statement narrations (Swiggy, Zomato, Blinkit, Zepto, DMart, Uber, IRCTC, Bescom, Jio, Netflix, Zerodha, etc.). When you manually classify a transaction or confirm its category, auto-categorization will <strong>never overwrite</strong> your confirmed label.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveTab("all")}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab("expense")}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "expense"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Expenses ({expenseCount})
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "income"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Income ({incomeCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading taxonomy categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center space-y-3">
            <Tag className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No Categories Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `No categories matched "${searchQuery}".`
                : "No categories match the active filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const isExpense = cat.kind === "expense";
            const isIncome = cat.kind === "income";

            return (
              <Card
                key={cat._id?.toString()}
                className="border-border hover:border-foreground/30 transition-all shadow-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="h-4 w-4 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: cat.color || "#6366f1" }}
                      />
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {cat.name}
                      </CardTitle>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <Badge
                        variant={isExpense ? "destructive" : isIncome ? "success" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {cat.kind}
                      </Badge>

                      {cat.isSystem ? (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Default
                        </Badge>
                      ) : (
                        <button
                          onClick={() => handleArchiveCategory(cat._id!.toString(), cat.name)}
                          title="Archive category"
                          className="p-1 rounded text-muted-foreground hover:text-rose-600 transition-colors"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Normalized: <code className="font-mono text-[11px]">{cat.nameNormalized}</code></span>
                  <Link
                    href={`/dashboard/transactions?search=${encodeURIComponent(cat.name)}`}
                    className="text-primary hover:underline font-semibold"
                  >
                    View Ledger &rarr;
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 space-y-5 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Add Custom Category</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gym & Fitness, Pet Care, OTT"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Classification Kind
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as CategoryKind)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="expense">Expense (Outflow)</option>
                  <option value="income">Income (Inflow)</option>
                  <option value="both">Both / General</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Theme Color Chip
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-6 w-6 rounded-full transition-transform ${
                        color === c ? "ring-2 ring-primary ring-offset-2 scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={creating || !name.trim()}
                  className="font-semibold"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Create Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

