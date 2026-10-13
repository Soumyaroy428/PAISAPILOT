import { Badge } from "@/client/components/ui/Badge";
import { Card, CardContent } from "@/client/components/ui/Card";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
      <div className="space-y-3">
        <Badge variant="secondary">Legal & Compliance</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: October 2026
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Data We Collect</h2>
            <p className="text-muted-foreground">
              PaisaPilot collects only the information necessary to provide personal finance analysis:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Account Information:</strong> Email address, hashed password, display name, and preferences.</li>
              <li><strong>Financial Records:</strong> Transaction details you manually enter or upload via bank statements (dates, amounts, descriptions, merchant labels, and categories).</li>
              <li><strong>Onboarding Profile:</strong> User persona responses (e.g. Student, Freelancer) to configure category recommendations.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. What We Never Collect</h2>
            <p className="text-muted-foreground">
              We strictly uphold non-negotiable security boundaries. We do <strong>not</strong> collect or store:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>UPI PINs, debit/credit card PINs, or CVV codes.</li>
              <li>Online banking login passwords or security answers.</li>
              <li>One-Time Passwords (OTPs) sent by your bank.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. How Your Statement Files are Handled</h2>
            <p className="text-muted-foreground">
              Uploaded bank statements (SBI PDF / CSV) are saved temporarily to private object storage solely for parsing.
              Once transactions are confirmed or rejected, temporary files are expired and deleted via automated lifecycle rules.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. AI Processing Safeguards</h2>
            <p className="text-muted-foreground">
              When using the AI financial assistant, only aggregated or bounded transaction figures necessary to answer your specific question are processed. The AI model operates within strict server-side tools and does not have unrestricted database access.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Data Retention & Deletion Rights</h2>
            <p className="text-muted-foreground">
              You have the right to download a machine-readable export of all your financial data or permanently delete your account and all associated records at any time through Account Settings.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

