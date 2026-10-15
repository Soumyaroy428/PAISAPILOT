"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Clock,
  FileSpreadsheet,
  PlusCircle,
  HelpCircle,
  Lock,
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

interface BankConnectionState {
  isFeatureEnabled: boolean;
  regulatoryNotice: string;
  activeConnection: {
    id: string;
    provider: string;
    status:
      | "not_started"
      | "pending_consent"
      | "active"
      | "rejected"
      | "expired"
      | "revoked"
      | "paused";
    consentExpiry?: string;
    lastSuccessfulSyncAt?: string;
    lastSyncStatus?: string;
    lastErrorCode?: string;
    linkedAccounts: Array<{
      maskedAccountNumber: string;
      institutionName: string;
    }>;
  } | null;
  supportedFallbackWorkflows: {
    manualLedgerAvailable: boolean;
    statementImportAvailable: boolean;
  };
}

function BankConnectionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<BankConnectionState | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Syncing & Disconnecting state
  const [syncing, setSyncing] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [showConnectModal, setShowConnectModal] = React.useState(false);
  const [selectedFip, setSelectedFip] = React.useState("HDFC_BANK");
  const [consentDays, setConsentDays] = React.useState(90);

  // Check URL query parameters on redirect back from provider
  React.useEffect(() => {
    const statusParam = searchParams.get("status");
    const errorParam = searchParams.get("error");

    if (statusParam === "connected") {
      setSuccessMsg("Bank account successfully linked via verified consent!");
    } else if (statusParam === "rejected") {
      setErrorMsg("Consent request was rejected or cancelled at the provider.");
    }

    if (errorParam) {
      setErrorMsg(`Authorization failed: ${errorParam}`);
    }
  }, [searchParams]);

  const fetchStatus = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/bank-sync/status");
      if (res.status === 401) {
        router.push("/login?redirect=/dashboard/settings/bank-connections");
        return;
      }
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      } else {
        setErrorMsg(json.error?.message || "Failed to load bank connection status.");
      }
    } catch {
      setErrorMsg("Unable to contact server. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/bank-sync/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionFipId: selectedFip,
          consentDurationDays: consentDays,
          scope: ["TRANSACTIONS", "PROFILE", "SUMMARY"],
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === "DISCOVERY_GATE_ACTIVE") {
          setErrorMsg(
            "Discovery Gate Active: Direct bank synchronization requires formal RBI Account Aggregator FIU licensing. Please use PhonePe / Bank PDF and CSV Statement Import."
          );
        } else {
          setErrorMsg(json.error?.message || "Failed to initiate bank consent.");
        }
        setShowConnectModal(false);
        return;
      }

      // If provider redirect URL is available, navigate to provider's hosted consent portal
      if (json.data?.redirectUrl) {
        window.location.href = json.data.redirectUrl;
      } else {
        await fetchStatus();
        setShowConnectModal(false);
      }
    } catch {
      setErrorMsg("Network error occurred while connecting. Please try again.");
      setShowConnectModal(false);
    }
  }

  async function handleTriggerSync() {
    if (!data?.activeConnection?.id) return;
    setSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/bank-sync/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: data.activeConnection.id }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Transaction synchronization failed.");
      } else {
        setSuccessMsg(
          `Sync successful: ${json.data.insertedCount} new transaction(s) recorded (${json.data.duplicateCount} duplicate(s) skipped).`
        );
        await fetchStatus();
      }
    } catch {
      setErrorMsg("Failed to synchronize bank transactions. Check network connection.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!data?.activeConnection?.id) return;
    if (!confirm("Are you sure you want to disconnect this bank account and revoke consent?")) {
      return;
    }

    setDisconnecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/bank-sync/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: data.activeConnection.id,
          reason: "User revoked consent via Settings",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Failed to revoke bank connection.");
      } else {
        setSuccessMsg("Bank connection has been revoked. No further syncs will occur.");
        await fetchStatus();
      }
    } catch {
      setErrorMsg("Failed to revoke connection.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Link
              href="/dashboard/settings"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Settings
            </Link>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-semibold text-primary">Bank Connections</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Bank Connections &amp; Auto-Sync
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your consent-based Account Aggregator connections or use zero-credential statement imports.
          </p>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-xs hover:underline text-emerald-600 dark:text-emerald-400 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs hover:underline text-rose-600 dark:text-rose-400 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Strict Security Architecture Notice */}
      <Card className="border-border bg-card/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Security &amp; Privacy Architecture</CardTitle>
              <CardDescription className="text-xs">
                Non-negotiable data protection principles
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-2.5 rounded-md bg-muted/40 border border-border space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" /> Zero Credentials Stored
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                PaisaPilot never asks for or stores banking passwords, UPI PINs, ATM PINs, or OTPs.
              </p>
            </div>
            <div className="p-2.5 rounded-md bg-muted/40 border border-border space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" /> No Screen Scraping
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                We never scrape net banking portals. Data exchange occurs only via regulated Account Aggregator APIs.
              </p>
            </div>
            <div className="p-2.5 rounded-md bg-muted/40 border border-border space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" /> Read-Only &amp; Revocable
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Consent is strictly read-only, time-bounded, and can be revoked at any moment from this dashboard.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Update-Delay &amp; Balance Notice:</span>
              <p className="text-muted-foreground dark:text-amber-300/80">
                Automated bank synchronization reflects posted bank transactions subject to provider update intervals. Synced data is an analytical ledger, not a guaranteed real-time balance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Connection Status Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Active Bank Connections</CardTitle>
                <CardDescription className="text-xs">
                  Connected institutions and consent status
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data?.isFeatureEnabled ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Feature Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Discovery Gate Active
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs pt-1">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span>Checking connection status...</span>
            </div>
          ) : !data?.isFeatureEnabled ? (
            /* Discovery Gate / Feature Flag Off View */
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 mt-0.5">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground text-sm">
                      Automatic Bank Sync is Currently in Regulatory Discovery
                    </h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      In India, automatic synchronization of customer banking statements is strictly governed by the Reserve Bank of India (RBI) under the <strong>Non-Banking Financial Company - Account Aggregator (NBFC-AA) Directions, 2016</strong>.
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Consuming bank data as a Financial Information User (FIU) requires registration with a financial regulator (RBI, SEBI, IRDAI, or PFRDA) or a formal authorized partner relationship with a licensed Account Aggregator (e.g. Setu, Finvu, OneMoney). PaisaPilot operates strictly within regulatory guidelines and does not simulate fake connections or use credential scraping.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-amber-500/15">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="font-semibold text-xs border-border opacity-70 cursor-not-allowed"
                    title="Live connection is disabled until provider onboarding passes discovery gate."
                  >
                    <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Connect Bank (Pending FIU Onboarding)
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Estimated Availability: Post FIU Registration
                  </span>
                </div>
              </div>
            </div>
          ) : data.activeConnection ? (
            /* Active Connection View */
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Connected Institution
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      {data.activeConnection.linkedAccounts[0]?.institutionName || "Partner Bank"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Account: {data.activeConnection.linkedAccounts[0]?.maskedAccountNumber || "••••"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        data.activeConnection.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : data.activeConnection.status === "expired"
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      Status: {data.activeConnection.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-border">
                  <div>
                    <span className="text-muted-foreground">Last Successful Sync:</span>
                    <div className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {data.activeConnection.lastSuccessfulSyncAt
                        ? new Date(data.activeConnection.lastSuccessfulSyncAt).toLocaleString()
                        : "Never synced"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consent Expiry:</span>
                    <div className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {data.activeConnection.consentExpiry
                        ? new Date(data.activeConnection.consentExpiry).toLocaleDateString()
                        : "Indefinite"}
                    </div>
                  </div>
                </div>

                {data.activeConnection.lastErrorCode && (
                  <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Last Sync Alert: {data.activeConnection.lastErrorCode}</span>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTriggerSync}
                    disabled={syncing || data.activeConnection.status !== "active"}
                    className="font-semibold text-xs border-border"
                  >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Synchronizing..." : "Sync Transactions Now"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="font-semibold text-xs text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-500/10"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {disconnecting ? "Revoking..." : "Revoke Consent & Disconnect"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Enabled but No Active Connection */
            <div className="text-center py-6 space-y-3">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">No Bank Account Linked</h3>
                <p className="text-muted-foreground text-xs max-w-md mx-auto">
                  Connect your bank account via RBI-regulated Account Aggregator to automatically import transactions.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowConnectModal(true)}
                className="font-semibold text-xs mt-2"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Connect Bank Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Fallback Workflows */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                Available &amp; Functional Workflows (Zero-Credential)
              </CardTitle>
              <CardDescription className="text-xs">
                Import statements securely without sharing bank logins
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs pt-1">
          <p className="text-muted-foreground leading-relaxed">
            While automated API synchronization completes regulatory onboarding, you can maintain 100% up-to-date financial records using PaisaPilot&apos;s privacy-first import tools:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Statement Import Engine
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Ready
                </Badge>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Upload PhonePe statements (e.g. Sept/Oct 2026), SBI bank PDFs, or generic bank CSV statements. Transactions are parsed and categorized with complete duplicate protection.
              </p>
              <div className="pt-1">
                <Link href="/dashboard/import">
                  <Button size="sm" variant="outline" className="w-full text-xs font-semibold">
                    Go to Statement Import
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 text-primary" /> Manual Ledger Entry
                </div>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  Ready
                </Badge>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Log cash, UPI, card, and net banking expenses and income on demand. Track your budget limits with zero third-party dependencies.
              </p>
              <div className="pt-1">
                <Link href="/dashboard/transactions">
                  <Button size="sm" variant="outline" className="w-full text-xs font-semibold">
                    Go to Transactions
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connect Modal Dialog */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">
                  Connect Bank via Account Aggregator
                </h3>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnect} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Select Financial Institution</label>
                <select
                  value={selectedFip}
                  onChange={(e) => setSelectedFip(e.target.value)}
                  className="w-full p-2 rounded-md border border-border bg-background text-foreground text-xs"
                >
                  <option value="HDFC_BANK">HDFC Bank</option>
                  <option value="SBI_BANK">State Bank of India (SBI)</option>
                  <option value="ICICI_BANK">ICICI Bank</option>
                  <option value="AXIS_BANK">Axis Bank</option>
                  <option value="KOTAK_BANK">Kotak Mahindra Bank</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Consent Validity</label>
                <select
                  value={consentDays}
                  onChange={(e) => setConsentDays(Number(e.target.value))}
                  className="w-full p-2 rounded-md border border-border bg-background text-foreground text-xs"
                >
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days (Recommended)</option>
                  <option value={180}>180 Days</option>
                  <option value={365}>1 Year</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5 text-[11px] text-muted-foreground">
                <div className="font-semibold text-foreground">Explicit Consent Scope:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Read-only account profile and transactions</li>
                  <li>No money transfer or debit mandate capabilities</li>
                  <li>Revocable at any time from your settings</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConnectModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Proceed to Provider Consent
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BankConnectionsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <BankConnectionsContent />
    </React.Suspense>
  );
}
