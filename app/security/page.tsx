import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  Trash2,
  FileCheck,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";

export default function SecurityPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="success" className="px-3 py-1">Trust & Privacy Architecture</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Security and Privacy First
        </h1>
        <p className="text-lg text-muted-foreground">
          Financial information is sensitive. PaisaPilot is built from the ground up with strict tenant isolation, data minimization, and transparent guardrails.
        </p>
      </div>

      {/* Non-Negotiable Security Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-border">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2">
              <EyeOff className="h-5 w-5" />
            </div>
            <CardTitle>Zero Credential Access</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            We will <strong>never</strong> ask for or store your UPI PIN, ATM PIN, online banking passwords, or OTPs. Statements are parsed only from files you explicitly upload.
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-2">
              <Database className="h-5 w-5" />
            </div>
            <CardTitle>Strict Tenant Isolation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Every database query and mutation is strictly scoped to your verified session identifier. Client-provided account IDs are never trusted as proof of ownership.
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center mb-2">
              <Lock className="h-5 w-5" />
            </div>
            <CardTitle>Restricted AI Gateway</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Our AI model has <strong>zero direct access</strong> to the database. It interacts exclusively through allowlisted backend tools with minimized, anonymized financial aggregates.
          </CardContent>
        </Card>
      </div>

      {/* Statement Lifecycle & Data Ownership */}
      <div className="rounded-2xl border border-border bg-card p-8 md:p-12 space-y-8">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Statement Processing & File Lifecycle</h2>
          <p className="text-sm text-muted-foreground">
            How your uploaded statement files are handled with absolute confidentiality.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-3.5">
            <FileCheck className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Private Temporary Storage</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Uploaded statements are stored in private, unguessable storage keys with automated TTL lifecycle deletion. Files are never exposed via public URLs.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3.5">
            <Trash2 className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">User-Controlled Export & Deletion</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You own your data. Export your entire transaction history and budgets in JSON or CSV at any time, or request complete, permanent account deletion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Explicit Regulatory Boundary */}
      <div className="p-6 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start space-x-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
          <h4 className="font-semibold text-sm">Regulatory Notice</h4>
          <p className="leading-relaxed">
            PaisaPilot is an analytical budgeting and spending insight application. It is not a registered financial advisor or payment processor. We do not provide regulated investment recommendations. Live bank synchronization is only introduced under formal Account Aggregator regulatory consent.
          </p>
        </div>
      </div>
    </div>
  );
}

