import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";

export default function FAQPage() {
  const faqs = [
    {
      q: "Which banks and statement formats are currently supported?",
      a: "PaisaPilot initially supports State Bank of India (SBI) monthly/annual statements in tested PDF and CSV formats. You can also import any standard CSV transaction export or record transactions manually (UPI, cards, cash).",
    },
    {
      q: "Does PaisaPilot require my net-banking password or UPI PIN?",
      a: "Never. PaisaPilot will never request or store your UPI PIN, ATM PIN, online banking passwords, or OTPs. All statement data is provided directly by you as a file upload.",
    },
    {
      q: "How does PaisaPilot avoid duplicate transactions if I upload overlapping statements?",
      a: "Our ingestion pipeline generates composite deduplication fingerprints based on transaction date, amount in integer paise, direction (debit/credit), normalized merchant name, and bank reference IDs (UTR). When you upload a statement, identical transactions are flagged for your review before committing.",
    },
    {
      q: "Can the AI hallucinate numbers or invent bank transactions?",
      a: "No. The AI assistant does not calculate numbers on its own and cannot query MongoDB directly. It calls allowlisted server tools that compute deterministic sums in backend services. The AI simply explains the verified results in natural language.",
    },
    {
      q: "How does the onboarding quiz work?",
      a: "When you first register, a short, step-by-step questionnaire asks for your financial profile (College Student, Young Professional, Freelancer, Family, or Small Business). Based on your answers, PaisaPilot automatically suggests tailored default expense categories and initial baseline budgets.",
    },
    {
      q: "Can I export or delete all my financial data?",
      a: "Yes. You maintain complete ownership over your records. You can download an export of your transactions, categories, and budgets in JSON or CSV, or trigger permanent account deletion in Account Settings.",
    },
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="secondary" className="px-3 py-1">Help & Clarity</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-muted-foreground">
          Everything you need to know about statement imports, security, and AI guardrails.
        </p>
      </div>

      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <Card key={index} className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-start space-x-3">
                <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>{faq.q}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed pl-11">
              {faq.a}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl bg-muted/60 border border-border p-8 text-center space-y-4">
        <h3 className="text-xl font-bold">Have additional questions?</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Explore our security documentation or get started today with zero risk.
        </p>
        <div className="flex justify-center space-x-4 pt-2">
          <Link href="/security">
            <Button variant="outline">Read Security Architecture</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

