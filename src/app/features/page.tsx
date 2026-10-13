import Link from "next/link";
import {
  FileSpreadsheet,
  PieChart,
  Bot,
  Calendar,
  Lock,
  ArrowRight,
  TrendingUp,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";

export default function FeaturesPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="secondary" className="px-3 py-1">Comprehensive Capabilities</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Features designed for financial mastery
        </h1>
        <p className="text-lg text-muted-foreground">
          Explore how PaisaPilot helps you take control of your expenses, parse bank statements, and uncover clear trends.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-border">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-2">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <CardTitle>Bank Statement Ingestion Pipeline</CardTitle>
            <CardDescription>
              User-uploaded statement parsing with preview verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Verified parsers for SBI PDF formats and standard bank CSV exports.</p>
            <p>• Review parsed rows, dates, debits, credits, and reference IDs before any transaction is saved.</p>
            <p>• Automatic duplicate candidate detection prevents double-counting transactions across multiple uploads.</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <CardTitle>Deterministic Calculations & Analytics</CardTitle>
            <CardDescription>
              Exact integer arithmetic eliminates rounding inconsistencies.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• All money stored as integer paise (₹1 = 100 paise) to prevent binary floating-point math errors.</p>
            <p>• Real-time income vs. expense summaries, category breakdowns, and month-over-month comparisons.</p>
            <p>• Clear data coverage indicators distinguishing imported statements from manual entries.</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center mb-2">
              <Bot className="h-5 w-5" />
            </div>
            <CardTitle>Grounded AI Financial Assistant</CardTitle>
            <CardDescription>
              Ask questions and get transparent answers derived from verified data.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• LLM queries restricted backend tools; no arbitrary raw database queries allowed.</p>
            <p>• Understands questions like &ldquo;How much did I spend on groceries in August?&rdquo;</p>
            <p>• Clear disclaimers stating data coverage, assumptions, and limitations.</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mb-2">
              <Sliders className="h-5 w-5" />
            </div>
            <CardTitle>Budgets & Recurring Payment Detection</CardTitle>
            <CardDescription>
              Stay ahead of billing cycles and category limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Set monthly or weekly spending limits with configurable alert thresholds.</p>
            <p>• Machine detection of recurring charges from merchant name, cadence, and amount tolerance.</p>
            <p>• Reviewable suggestions that require your confirmation before locking in as subscriptions.</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl bg-muted/60 border border-border p-8 text-center space-y-4">
        <h3 className="text-2xl font-bold">Ready to experience PaisaPilot?</h3>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm">
          Start for free and experience private, transparent, and grounded personal finance intelligence.
        </p>
        <div className="pt-2">
          <Link href="/register">
            <Button size="lg">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

