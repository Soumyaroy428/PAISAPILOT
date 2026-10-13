import { Badge } from "@/client/components/ui/Badge";
import { Card, CardContent } from "@/client/components/ui/Card";

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
      <div className="space-y-3">
        <Badge variant="secondary">Legal & Compliance</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: October 2026
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Description of Service</h2>
            <p className="text-muted-foreground">
              PaisaPilot provides personal finance intelligence, expense categorization, budget tracking, and statement analysis. The platform operates on manual transaction entry and user-provided bank statement files.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Financial Disclaimer — No Investment Advice</h2>
            <p className="text-muted-foreground">
              PaisaPilot is not a registered investment advisor, broker, or financial institution under SEBI, RBI, or any regulatory authority. All analysis, metrics, and AI assistant outputs are provided solely for informational and educational purposes. You should consult a licensed financial professional before making financial, tax, or investment decisions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Banking & Transaction Limits</h2>
            <p className="text-muted-foreground">
              PaisaPilot does not initiate payments, move funds, or hold deposits. Stated balances from imported statements reflect historical records only and are not guaranteed real-time bank balances.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. User Responsibility</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account credentials and ensuring the accuracy of statement files you choose to upload.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

