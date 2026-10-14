"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
  Wallet,
  PlusCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Archive,
  CheckCircle2,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";
import { formatPaiseToINR } from "@/client/lib/utils";
import { AccountDocument, AccountType } from "@/server/models/account";

const ACCOUNT_ICONS: Record<AccountType, React.ElementType> = {
  bank_account: Building2,
  upi: Smartphone,
  credit_card: CreditCard,
  debit_card: CreditCard,
  cash: Banknote,
  wallet: Wallet,
  other: Wallet,
};

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank_account: "Bank Account",
  upi: "UPI Wallet",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  cash: "Cash in Hand",
  wallet: "Digital Wallet",
  other: "Other Source",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<AccountDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>("bank_account");
  const [institution, setInstitution] = React.useState("");
  const [accountNumberMasked, setAccountNumberMasked] = React.useState("");
  const [initialBalanceInr, setInitialBalanceInr] = React.useState<number>(0);

  const fetchAccounts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to load accounts.");
      const data = await res.json();
      setAccounts(data.data?.accounts || []);
    } catch (err: any) {
      setError(err.message || "Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const payload = {
        name,
        type,
        institution: institution || undefined,
        accountNumberMasked: accountNumberMasked || undefined,
        initialBalancePaise: Math.round(Number(initialBalanceInr) * 100),
      };

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create account.");
      }

      // Reset form and refresh list
      setName("");
      setInstitution("");
      setAccountNumberMasked("");
      setInitialBalanceInr(0);
      setShowAddModal(false);
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message || "Failed to save account.");
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Are you sure you want to archive this account? Historical transactions will remain preserved.")) {
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAccounts();
      }
    } catch (err) {
      console.error("Archive failed:", err);
    }
  }

  const totalBalancePaise = accounts.reduce((acc, a) => acc + (a.currentBalancePaise || 0), 0);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Payment Accounts & Sources
          </h1>
          <p className="text-sm text-muted-foreground">
            Track running balances across your Indian bank accounts, UPI handles, cards, and physical cash.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="font-semibold shadow-sm"
        >
          <PlusCircle className="mr-1.5 h-4 w-4" /> Add Payment Source
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-2 text-sm text-rose-800 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate Balance Card */}
      <Card className="border-border shadow-sm bg-gradient-to-br from-card to-muted/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Total Reconciled Liquidity
              </span>
              <div className="text-3xl font-bold text-foreground mt-1">
                {formatPaiseToINR(totalBalancePaise)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sum across {accounts.length} active account{accounts.length === 1 ? "" : "s"} (integer paise precision)
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-muted/60 p-3 rounded-lg border border-border">
              <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span>Masked storage: Zero banking passwords or UPI PINs needed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Account Modal Form */}
      {showAddModal && (
        <Card className="border-primary/40 shadow-xl bg-card">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="text-lg">Add New Payment Account</CardTitle>
            <CardDescription className="text-xs">
              Link a new financial source for recording income and expenses.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleCreateAccount} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Account Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. HDFC Salary Account"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Source Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="bank_account">Bank Account (Savings / Current)</option>
                    <option value="upi">UPI ID / Handle</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="wallet">Digital Wallet</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Institution / Provider (Optional)
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. HDFC Bank, SBI, Paytm"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Masked Identifier (Optional)
                  </label>
                  <input
                    type="text"
                    value={accountNumberMasked}
                    onChange={(e) => setAccountNumberMasked(e.target.value)}
                    placeholder="e.g. •••• 4589 or user@okaxis"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Initial Balance (₹ INR)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={initialBalanceInr}
                    onChange={(e) => setInitialBalanceInr(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Converted to exact integer paise ({Math.round(initialBalanceInr * 100)} paise)
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <Button type="submit" disabled={creating} className="font-semibold">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Save Account
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

      {/* Accounts List */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-border text-center py-12">
          <CardContent className="space-y-3">
            <Wallet className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-semibold">No accounts found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add your bank account, UPI handle, or cash wallet to start tracking balances and transactions.
            </p>
            <Button onClick={() => setShowAddModal(true)} size="sm" className="font-semibold">
              Add First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => {
            const Icon = ACCOUNT_ICONS[acc.type] || Wallet;
            const isNegative = (acc.currentBalancePaise || 0) < 0;

            return (
              <Card key={acc._id?.toString()} className="border-border shadow-sm hover:border-foreground/20 transition-all">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold leading-tight">{acc.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {acc.institution || ACCOUNT_TYPE_LABELS[acc.type]}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {acc.type.replace(/_/g, " ")}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4 pt-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Current Balance
                    </span>
                    <div className={`text-2xl font-bold tracking-tight ${isNegative ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                      {formatPaiseToINR(acc.currentBalancePaise || 0)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                    <span>{acc.accountNumberMasked || "No identifier"}</span>
                    <button
                      onClick={() => handleArchive(acc._id!.toString())}
                      className="text-muted-foreground hover:text-rose-600 transition-colors flex items-center space-x-1"
                      title="Archive account"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>Archive</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

