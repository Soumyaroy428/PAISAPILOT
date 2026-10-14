"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Info,
  Calendar,
  Wallet,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";
import { formatPaiseToINR } from "@/client/lib/utils";
import { ImportDocument, CandidateImportRow, ImportSourceType } from "@/server/models/import";
import { AccountDocument } from "@/server/models/account";

export default function StatementImportPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"upload" | "preview" | "success">("upload");

  // Accounts
  const [accounts, setAccounts] = React.useState<AccountDocument[]>([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("");

  // Upload Form State
  const [sourceType, setSourceType] = React.useState<ImportSourceType>("csv");
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Preview State
  const [importSession, setImportSession] = React.useState<ImportDocument | null>(null);
  const [rows, setRows] = React.useState<CandidateImportRow[]>([]);
  const [committing, setCommitting] = React.useState(false);
  const [commitResult, setCommitResult] = React.useState<{
    insertedCount: number;
    duplicateCount: number;
  } | null>(null);

  // Fetch accounts on mount
  React.useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const json = await res.json();
          const accs = json.data?.accounts || [];
          setAccounts(accs);
          if (accs.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accs[0]._id.toString());
          }
        }
      } catch (err) {
        console.error("Failed to load accounts:", err);
      }
    }
    loadAccounts();
  }, [selectedAccountId]);

  // Handle File Upload & Parse
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceType", sourceType);
      if (selectedAccountId) {
        formData.append("accountId", selectedAccountId);
      }

      const res = await fetch("/api/imports/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to process statement.");
      }

      const session: ImportDocument = json.data?.importPreview;
      setImportSession(session);
      setRows(session.parsedRows || []);
      setStep("preview");
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  }

  // Row selection toggles
  function toggleRow(rowIndex: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex ? { ...r, selectedForCommit: !r.selectedForCommit } : r
      )
    );
  }

  function selectAllValid() {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        selectedForCommit: r.status === "valid",
      }))
    );
  }

  function deselectAll() {
    setRows((prev) => prev.map((r) => ({ ...r, selectedForCommit: false })));
  }

  // Commit selected transactions
  async function handleCommit() {
    if (!importSession || !importSession._id) return;
    if (!selectedAccountId) {
      setError("Please select a target account to assign these transactions to.");
      return;
    }

    const selectedIndices = rows
      .filter((r) => r.selectedForCommit && r.status !== "invalid")
      .map((r) => r.rowIndex);

    if (selectedIndices.length === 0) {
      setError("Please select at least one transaction to commit.");
      return;
    }

    setCommitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/imports/${importSession._id.toString()}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          selectedRowIndices: selectedIndices,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to commit import.");
      }

      setCommitResult({
        insertedCount: json.data?.insertedCount || selectedIndices.length,
        duplicateCount: json.data?.duplicateCount || 0,
      });
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to commit transactions.");
    } finally {
      setCommitting(false);
    }
  }

  const selectedCount = rows.filter((r) => r.selectedForCommit).length;
  const duplicateCount = rows.filter((r) => r.status === "duplicate").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;
  const validCount = rows.filter((r) => r.status === "valid").length;

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
            Statement Import Pipeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload bank CSV statements or tested SBI e-Statements with preview verification and duplicate defense.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg border border-border">
          <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <span>Local processing: Statements are never shared externally</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-2 text-sm text-rose-800 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Upload Form */}
      {step === "upload" && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Select Statement File</CardTitle>
              <CardDescription className="text-xs">
                Choose your bank statement file and assign it to an account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-5">
                {/* Format Switcher */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Statement Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSourceType("csv")}
                      className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                        sourceType === "csv"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent/40"
                      }`}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>CSV Statement (Universal)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceType("sbi_pdf")}
                      className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                        sourceType === "sbi_pdf"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent/40"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>PDF Statement (PhonePe / SBI)</span>
                    </button>
                  </div>
                </div>

                {/* Target Account */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Target Payment Account
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Select Target Account --</option>
                    {accounts.map((a) => (
                      <option key={a._id?.toString()} value={a._id?.toString()}>
                        {a.name} ({formatPaiseToINR(a.currentBalancePaise || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Drop Area */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Upload File</label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-foreground/30 transition-colors bg-muted/20">
                    <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      {file ? file.name : "Drag and drop your file here, or browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sourceType === "csv" ? "Supports .csv files up to 5 MB" : "Supports official PhonePe & SBI e-Statement .pdf up to 5 MB"}
                    </p>
                    <input
                      type="file"
                      accept={sourceType === "csv" ? ".csv" : ".pdf"}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                      className="mt-3 text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:cursor-pointer"
                    />
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-3.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 flex items-start space-x-2 text-xs text-sky-800 dark:text-sky-300">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="leading-relaxed">
                    <strong>Preview Guarantee:</strong> Uploading will parse the file into a preview table first. You can inspect every candidate row, deselect duplicates, and confirm before anything is added to your ledger.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full font-semibold"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Parsing Statement...
                    </>
                  ) : (
                    <>
                      Parse Statement & Generate Preview &rarr;
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 2: Interactive Candidate Rows Preview */}
      {step === "preview" && importSession && (
        <div className="space-y-6">
          {/* Summary Badges Card */}
          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-foreground">Import Preview Summary</h2>
                    <Badge variant="outline" className="text-xs uppercase">
                      {importSession.originalFileName}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Found {rows.length} total rows. Select which transactions you want to commit into your ledger.
                  </p>
                </div>

                {/* Target Account Picker in Preview */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Commit to:</span>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {accounts.map((a) => (
                      <option key={a._id?.toString()} value={a._id?.toString()}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border">
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">Total Rows</span>
                  <div className="text-xl font-bold text-foreground">{rows.length}</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  <span className="text-[11px] uppercase font-semibold">Ready to Import</span>
                  <div className="text-xl font-bold">{validCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                  <span className="text-[11px] uppercase font-semibold">Duplicates Detected</span>
                  <div className="text-xl font-bold">{duplicateCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300">
                  <span className="text-[11px] uppercase font-semibold">Invalid / Malformed</span>
                  <div className="text-xl font-bold">{invalidCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <Button size="sm" variant="outline" onClick={selectAllValid}>
                Select All Valid ({validCount})
              </Button>
              <Button size="sm" variant="outline" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("upload")}
                disabled={committing}
              >
                Upload Different File
              </Button>
              <Button
                size="sm"
                onClick={handleCommit}
                disabled={committing || selectedCount === 0}
                className="font-semibold shadow-sm bg-primary text-primary-foreground"
              >
                {committing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Committing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Commit {selectedCount} Transactions
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Candidate Table */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-10">Select</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => {
                      const isIncome = row.type === "income";
                      const isDuplicate = row.status === "duplicate";
                      const isInvalid = row.status === "invalid";

                      return (
                        <tr
                          key={row.rowIndex}
                          className={`transition-colors ${
                            isDuplicate
                              ? "bg-amber-500/5 hover:bg-amber-500/10 opacity-75"
                              : isInvalid
                              ? "bg-rose-500/5 hover:bg-rose-500/10 opacity-60"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={row.selectedForCommit}
                              disabled={isInvalid}
                              onChange={() => toggleRow(row.rowIndex)}
                              className="rounded border-input accent-primary cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                            {row.transactionDate}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground max-w-xs">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="truncate">{row.description}</span>
                              {row.categoryName && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-medium bg-primary/5 text-primary border-primary/20 shrink-0"
                                >
                                  {row.categoryName}
                                </Badge>
                              )}
                            </div>
                            {row.validationError && (
                              <p className="text-[10px] text-rose-600 font-normal">{row.validationError}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                            {row.referenceNo || "—"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge
                              variant={isIncome ? "success" : "destructive"}
                              className="text-[10px]"
                            >
                              {isIncome ? "Credit" : "Debit"}
                            </Badge>
                          </td>
                          <td className={`py-3 px-4 whitespace-nowrap text-right font-bold text-sm ${
                            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                          }`}>
                            {isIncome ? "+" : "-"}
                            {formatPaiseToINR(row.amountPaise)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            {isDuplicate ? (
                              <Badge variant="warning" className="text-[10px]">
                                Duplicate
                              </Badge>
                            ) : isInvalid ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Invalid
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                                Ready
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: Success Screen */}
      {step === "success" && commitResult && (
        <Card className="border-border text-center py-12 max-w-lg mx-auto shadow-sm">
          <CardContent className="space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Statement Import Committed</h2>
            <p className="text-sm text-muted-foreground">
              Successfully recorded <span className="font-semibold text-foreground">{commitResult.insertedCount} transactions</span> into your ledger and atomically updated the account balance.
            </p>
            {commitResult.duplicateCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ({commitResult.duplicateCount} duplicate transactions safely skipped to prevent double-counting)
              </p>
            )}

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/dashboard/transactions">
                <Button className="font-semibold">
                  View Ledger &rarr;
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setImportSession(null);
                  setRows([]);
                }}
              >
                Import Another Statement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

