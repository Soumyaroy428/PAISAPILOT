"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Download,
  Trash2,
  Lock,
  User,
  KeyRound,
  FileSpreadsheet,
  FileCode,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<{
    id?: string;
    email?: string;
    displayName?: string;
    persona?: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          setUser(json.data?.user || null);
        } else {
          router.push("/login?redirect=/dashboard/settings");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setDeleteError("Password is required to confirm account deletion.");
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setDeleteError(json.error?.message || "Failed to delete account. Please try again.");
        return;
      }

      // Successfully purged account
      router.push("/login?deleted=true");
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
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
            <span className="text-xs font-semibold text-primary">Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Security &amp; Data Privacy
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your account security, download complete financial exports, or exercise your Right to be Forgotten.
          </p>
        </div>
      </div>

      {/* Profile & Security Information */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Account Identity</CardTitle>
              <CardDescription className="text-xs">Your verified profile details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-muted-foreground">Display Name</span>
              <div className="font-semibold text-foreground text-sm">{user?.displayName}</div>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-muted-foreground">Email Address</span>
              <div className="font-semibold text-foreground text-sm">{user?.email}</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Session Authenticated via Secure HttpOnly Cookie (AES-256 JWT)</span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Data Portability (GDPR & Indian DPDPA Compliance) */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Data Portability &amp; Self-Serve Exports</CardTitle>
              <CardDescription className="text-xs">
                Download a complete, unencrypted copy of your personal financial records
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs pt-1">
          <p className="text-muted-foreground leading-relaxed">
            You maintain 100% ownership over your data. In compliance with data protection laws, you can export all your financial transactions, accounts, and categories anytime.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a href="/api/analytics/export?format=csv" download>
              <Button size="sm" variant="outline" className="font-semibold text-xs border-border">
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> Download Sanitized CSV
              </Button>
            </a>
            <a href="/api/analytics/export?format=json" download>
              <Button size="sm" variant="outline" className="font-semibold text-xs border-border">
                <FileCode className="mr-1.5 h-3.5 w-3.5 text-sky-500" /> Download Full JSON Archive
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone: Account Deletion (Right to be Forgotten) */}
      <Card className="border-rose-500/30 bg-rose-500/5 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                Danger Zone: Account &amp; Data Deletion
              </CardTitle>
              <CardDescription className="text-xs text-rose-900/70 dark:text-rose-200/70">
                Exercise your Right to be Forgotten (Irreversible)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs pt-1">
          <p className="text-muted-foreground leading-relaxed">
            Permanently deletes your account and instantly cascades a purge across all database collections:
            your transactions, payment accounts, custom categories, monthly budgets, recurring subscriptions, notifications, and uploaded statements.
          </p>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteError(null);
                setPassword("");
              }}
              className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 font-semibold text-xs"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete My Account &amp; Data...
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accessible Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-500/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 id="delete-modal-title" className="text-base font-bold text-foreground">
                  Confirm Permanent Deletion
                </h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              To verify that this is you, please enter your password. Upon confirmation, all your data will be permanently wiped from the database.
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Account Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password to confirm"
                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={deleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Purging Data...
                    </>
                  ) : (
                    "Permanently Delete Account"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

