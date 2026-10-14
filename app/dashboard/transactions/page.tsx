"use client";

import * as React from "react";
import Link from "next/link";
import {
  PlusCircle,
  ArrowLeft,
  ArrowRight,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Repeat,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle,
  IndianRupee,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";
import { formatPaiseToINR } from "@/client/lib/utils";
import {
  TransactionDocument,
  TransactionType,
  PaymentMode,
} from "@/server/models/transaction";
import { AccountDocument } from "@/server/models/account";

export default function TransactionsPage() {
  const [transactions, setTransactions] = React.useState<TransactionDocument[]>([]);
  const [accounts, setAccounts] = React.useState<AccountDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState({
    totalIncomePaise: 0,
    totalExpensePaise: 0,
    netCashflowPaise: 0,
  });
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 15,
    totalCount: 0,
    totalPages: 1,
  });

  // Filters
  const [filterType, setFilterType] = React.useState<string>("");
  const [filterAccount, setFilterAccount] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Add Transaction Modal State
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form Fields
  const [formType, setFormType] = React.useState<TransactionType>("expense");
  const [formAmountInr, setFormAmountInr] = React.useState<number | "">("");
  const [formDate, setFormDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formDescription, setFormDescription] = React.useState("");
  const [formCategory, setFormCategory] = React.useState("");
  const [formAccountId, setFormAccountId] = React.useState("");
  const [formToAccountId, setFormToAccountId] = React.useState("");
  const [formPaymentMode, setFormPaymentMode] = React.useState<PaymentMode>("upi");
  const [formNotes, setFormNotes] = React.useState("");

  // Fetch Accounts
  const fetchAccounts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.data?.accounts || []);
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  }, []);

  // Fetch Transactions
  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (filterType) params.set("type", filterType);
      if (filterAccount) params.set("accountId", filterAccount);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load transactions.");

      const json = await res.json();
      setTransactions(json.data?.transactions || []);
      if (json.data?.pagination) {
        setPagination(json.data.pagination);
      }
      if (json.data?.summary) {
        setSummary(json.data.summary);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filterType, filterAccount, searchQuery]);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const amountNum = Number(formAmountInr);
    if (!amountNum || amountNum <= 0) {
      setFormError("Please enter a valid positive amount.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: formType,
        amountPaise: Math.round(amountNum * 100),
        transactionDate: formDate,
        description: formDescription,
        categoryName: formCategory || undefined,
        accountId: formAccountId || undefined,
        toAccountId: formType === "transfer" ? formToAccountId || undefined : undefined,
        paymentMode: formPaymentMode,
        notes: formNotes || undefined,
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to record transaction.");
      }

      // Reset and refresh
      setFormAmountInr("");
      setFormDescription("");
      setFormCategory("");
      setFormNotes("");
      setShowAddModal(false);
      await fetchTransactions();
      await fetchAccounts();
    } catch (err: any) {
      setFormError(err.message || "Failed to create transaction.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm("Are you sure you want to delete this transaction? Account balances will be automatically adjusted.")) {
      return;
    }

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchTransactions();
        await fetchAccounts();
      }
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  }

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
            Transaction Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Record, audit, and categorize income, expenses, and account transfers in exact integer paise.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/dashboard/accounts">
            <Button variant="outline" size="sm" className="font-semibold text-xs">
              <Wallet className="mr-1.5 h-4 w-4" /> Manage Accounts
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="font-semibold shadow-sm text-xs"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Inflow */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Inflows
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaiseToINR(summary.totalIncomePaise)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Salary, allowances, credits</p>
          </CardContent>
        </Card>

        {/* Total Outflow */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Outflows
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatPaiseToINR(summary.totalExpensePaise)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Daily debits, bills, spends</p>
          </CardContent>
        </Card>

        {/* Net Cashflow */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Net Cashflow
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Repeat className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${summary.netCashflowPaise >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400"}`}>
              {formatPaiseToINR(summary.netCashflowPaise)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Inflows minus Outflows</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Transaction Modal / Form */}
      {showAddModal && (
        <Card className="border-primary/40 shadow-xl bg-card">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="text-lg">Record New Transaction</CardTitle>
            <CardDescription className="text-xs">
              Add a manual transaction to your financial ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleCreateTransaction} className="space-y-4 max-w-2xl">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-2 text-xs text-rose-800 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Type Switcher */}
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setFormType("expense")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    formType === "expense"
                      ? "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300"
                      : "border-border text-muted-foreground hover:bg-accent/40"
                  }`}
                >
                  Expense (Debit)
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("income")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    formType === "income"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      : "border-border text-muted-foreground hover:bg-accent/40"
                  }`}
                >
                  Income (Credit)
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("transfer")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    formType === "transfer"
                      ? "bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300"
                      : "border-border text-muted-foreground hover:bg-accent/40"
                  }`}
                >
                  Account Transfer
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Amount (₹ INR)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={formAmountInr}
                      onChange={(e) => setFormAmountInr(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 450.00"
                      className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                    />
                  </div>
                  {formAmountInr !== "" && (
                    <p className="text-[11px] text-muted-foreground">
                      Exact paise value: {Math.round(Number(formAmountInr) * 100)} paise
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Description
                  </label>
                  <input
                    type="text"
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Swiggy food delivery, Monthly rent"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Category (Optional)
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Food & Dining, Rent, Grocery"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {formType === "transfer" ? "Source Account" : "Account / Payment Source"}
                  </label>
                  <select
                    value={formAccountId}
                    onChange={(e) => setFormAccountId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Select Source Account --</option>
                    {accounts.map((a) => (
                      <option key={a._id?.toString()} value={a._id?.toString()}>
                        {a.name} ({formatPaiseToINR(a.currentBalancePaise || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                {formType === "transfer" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Destination Account
                    </label>
                    <select
                      value={formToAccountId}
                      onChange={(e) => setFormToAccountId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Select Destination Account --</option>
                      {accounts
                        .filter((a) => a._id?.toString() !== formAccountId)
                        .map((a) => (
                          <option key={a._id?.toString()} value={a._id?.toString()}>
                            {a.name} ({formatPaiseToINR(a.currentBalancePaise || 0)})
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Payment Mode
                    </label>
                    <select
                      value={formPaymentMode}
                      onChange={(e) => setFormPaymentMode(e.target.value as PaymentMode)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="card">Card (Debit / Credit)</option>
                      <option value="netbanking">Net Banking</option>
                      <option value="cash">Cash</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional reference note or remarks"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <Button type="submit" disabled={submitting} className="font-semibold">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Save Transaction
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="border-border shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search description..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Types (Income & Expenses)</option>
                <option value="expense">Expenses Only</option>
                <option value="income">Income Only</option>
                <option value="transfer">Transfers Only</option>
              </select>
            </div>

            {/* Account Filter */}
            <div>
              <select
                value={filterAccount}
                onChange={(e) => {
                  setFilterAccount(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a._id?.toString()} value={a._id?.toString()}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="text-base font-semibold">No transactions recorded yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Record your first expense, salary, or transfer to populate your ledger.
              </p>
              <Button onClick={() => setShowAddModal(true)} size="sm" className="font-semibold">
                Record First Transaction
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card List (sm:hidden) */}
              <div className="sm:hidden divide-y divide-border">
                {transactions.map((tx) => {
                  const isIncome = tx.type === "income";
                  const isTransfer = tx.type === "transfer";
                  const dateFormatted = new Date(tx.transactionDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <div key={tx._id?.toString()} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-sm text-foreground leading-snug">
                            {tx.description}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{dateFormatted}</span>
                            <span>•</span>
                            <span>{tx.accountName || "Unassigned"}</span>
                            {tx.paymentMode && (
                              <span className="text-[10px] uppercase font-bold text-primary">
                                ({tx.paymentMode})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-bold text-base ${
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isTransfer
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-foreground"
                          }`}>
                            {isIncome ? "+" : isTransfer ? "" : "-"}
                            {formatPaiseToINR(tx.amountPaise)}
                          </div>
                          <div className="mt-0.5">
                            {isIncome ? (
                              <Badge variant="success" className="text-[10px] py-0">Income</Badge>
                            ) : isTransfer ? (
                              <Badge variant="secondary" className="text-[10px] py-0">Transfer</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] py-0">Expense</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {tx.categoryName && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {tx.categoryName}
                            </Badge>
                          )}
                          {tx.notes && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {tx.notes}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteTransaction(tx._id!.toString())}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                          title="Delete transaction"
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / Tablet Table (hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Account / Mode</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx) => {
                      const isIncome = tx.type === "income";
                      const isTransfer = tx.type === "transfer";
                      const dateFormatted = new Date(tx.transactionDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <tr key={tx._id?.toString()} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                            {dateFormatted}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">{tx.description}</div>
                            {tx.categoryName && (
                              <Badge variant="outline" className="text-[10px] mt-0.5">
                                {tx.categoryName}
                              </Badge>
                            )}
                            {tx.notes && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{tx.notes}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                            <div>{tx.accountName || "Unassigned"}</div>
                            {tx.paymentMode && (
                              <span className="text-[10px] uppercase font-medium text-primary">
                                {tx.paymentMode}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isIncome ? (
                              <Badge variant="success" className="text-[10px]">
                                Income
                              </Badge>
                            ) : isTransfer ? (
                              <Badge variant="secondary" className="text-[10px]">
                                Transfer
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">
                                Expense
                              </Badge>
                            )}
                          </td>
                          <td className={`py-3 px-4 whitespace-nowrap text-right font-bold text-sm ${
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isTransfer
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-foreground"
                          }`}>
                            {isIncome ? "+" : isTransfer ? "" : "-"}
                            {formatPaiseToINR(tx.amountPaise)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDeleteTransaction(tx._id!.toString())}
                              className="p-1 rounded text-muted-foreground hover:text-rose-600 transition-colors"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t border-border text-xs text-muted-foreground">
              <span>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} entries)
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
