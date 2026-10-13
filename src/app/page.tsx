import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  PieChart,
  Bot,
  CheckCircle2,
  Lock,
  GraduationCap,
  Briefcase,
  Laptop,
  Users,
  Store,
  Sparkles,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-28 bg-gradient-to-b from-background via-muted/30 to-background border-b border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center space-x-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Financial Intelligence for Indian Users</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Understand your money. <br />
                <span className="text-primary">Make clearer financial decisions.</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Consolidate UPI transactions, card payments, and cash in one private dashboard.
                Import SBI bank statements safely, set intelligent budgets, and get grounded AI insights
                backed by verified figures.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto font-semibold px-8">
                    Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/how-it-works">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    See How It Works
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 flex flex-wrap gap-y-2 gap-x-6 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>No UPI PIN or bank login required</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Preview statements before saving</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Exact integer paise calculation</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive App Preview Mockup */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Monthly Summary
                    </p>
                    <h3 className="text-lg font-bold text-foreground">September 2026</h3>
                  </div>
                  <Badge variant="success">Statement Verified</Badge>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Total Income</p>
                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-200">₹68,500.00</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60">
                    <p className="text-xs font-medium text-rose-700 dark:text-rose-400">Total Expenses</p>
                    <p className="text-xl font-bold text-rose-900 dark:text-rose-200">₹42,120.50</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-muted/60 border border-border space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Net Cash Flow:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">+₹26,379.50</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Monthly Budget Cap:</span>
                    <span className="font-semibold text-foreground">₹50,000.00 (84% used)</span>
                  </div>
                </div>

                {/* Grounded AI Assistant Mockup */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex items-center space-x-2 text-primary font-semibold text-xs">
                    <Bot className="h-4 w-4" />
                    <span>Grounded Assistant Insight</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    &ldquo;Your dining & food delivery expenses rose 18% compared to August.
                    You have ₹7,879.50 headroom remaining in your monthly target.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Target Personas Section */}
      <section className="py-16 md:py-24 bg-card border-b border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Built for your unique financial situation
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Every financial journey is different. Our step-by-step onboarding quiz adapts immediately
              to your profile to suggest the right categories and spending limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <Card className="hover:border-primary/50 transition-all hover:shadow-md">
              <CardHeader className="p-5 pb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-2">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">College Students</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-xs text-muted-foreground leading-relaxed">
                Keep allowances and pocket money in check. Track mess fees, study materials, and campus outings.
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all hover:shadow-md">
              <CardHeader className="p-5 pb-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2">
                  <Briefcase className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Young Professionals</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-xs text-muted-foreground leading-relaxed">
                Balance salary credits, rent, EMIs, SIP investments, and weekend lifestyle spending.
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all hover:shadow-md">
              <CardHeader className="p-5 pb-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center mb-2">
                  <Laptop className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Freelancers</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-xs text-muted-foreground leading-relaxed">
                Navigate irregular income inflows, set dry-spell buffers, and track project software expenses.
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all hover:shadow-md">
              <CardHeader className="p-5 pb-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mb-2">
                  <Users className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Families</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-xs text-muted-foreground leading-relaxed">
                Monitor collective groceries, school tuition, domestic utilities, and emergency reserves.
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-all hover:shadow-md">
              <CardHeader className="p-5 pb-3">
                <div className="h-10 w-10 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mb-2">
                  <Store className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Small Businesses</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 text-xs text-muted-foreground leading-relaxed">
                Segregate personal drawings from operational expenses and monitor vendor billing cycles.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. Core Capabilities Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Everything you need to master your cash flow
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              No guesswork, no inaccurate floating-point totals, and no black-box AI fabrication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <CardTitle>SBI Statement Import Pipeline</CardTitle>
                <CardDescription>
                  Upload your SBI PDF or CSV statements securely. Review all parsed rows, duplicate warnings, and balance verifications before committing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                  <PieChart className="h-5 w-5" />
                </div>
                <CardTitle>Deterministic Calculations</CardTitle>
                <CardDescription>
                  All monetary values are calculated in strict integer paise. Totals, category distributions, and trends are 100% deterministic and auditable.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-2">
                  <Bot className="h-5 w-5" />
                </div>
                <CardTitle>Grounded AI Financial Assistant</CardTitle>
                <CardDescription>
                  Ask natural questions like &ldquo;Why did my expenses spike last month?&rdquo; The AI uses restricted backend tools and server-verified numbers.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
                  <Lock className="h-5 w-5" />
                </div>
                <CardTitle>Private by Default</CardTitle>
                <CardDescription>
                  All data queries are strictly scoped to your authenticated account. Statements are processed in private storage with automated TTL expiration.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle>Smart Recurring Detection</CardTitle>
                <CardDescription>
                  Detect candidate subscriptions and recurring bills automatically. Uncertain matches remain reviewable suggestions until you confirm.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle>User Data Ownership</CardTitle>
                <CardDescription>
                  Export all your transactions, categories, and budgets anytime in machine-readable JSON or CSV. Request complete account deletion with one click.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Bottom CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Take command of your financial journey today
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto leading-relaxed">
            Join users who trust PaisaPilot for honest, secure, and grounded personal finance intelligence.
          </p>
          <div className="pt-2">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="font-semibold px-8 shadow-md">
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

