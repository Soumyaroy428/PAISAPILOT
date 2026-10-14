import Link from "next/link";
import { Wallet, ShieldAlert } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card text-card-foreground">
      <div className="container mx-auto max-w-7xl px-4 pt-12 pb-24 md:pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wallet className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Paisa<span className="text-primary">Pilot</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered personal finance intelligence designed for India. Gain complete clarity over UPI, card, and cash expenses with verified data and grounded insights.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features & Overview
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-muted-foreground hover:text-foreground transition-colors">
                  Security & Privacy
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
              Trust & Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/api/health" className="text-muted-foreground hover:text-foreground transition-colors">
                  System Health Check
                </Link>
              </li>
            </ul>
          </div>

          {/* India Banking Guardrail Advisory */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/60 border border-border/80">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-medium text-xs">
              <ShieldAlert className="h-4 w-4 flex-shrink-0" />
              <span>Security Advisory</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              PaisaPilot will <strong>never</strong> ask for your UPI PIN, net-banking passwords, debit card PINs, or OTPs. All bank statement parsing runs in private isolated environments.
            </p>
          </div>
        </div>

        {/* Legal Disclaimer & Copyright */}
        <div className="border-t border-border pt-6 text-xs text-muted-foreground space-y-2">
          <p>
            <strong>Disclaimer:</strong> PaisaPilot is a personal financial analysis and intelligence platform. It does not move funds, execute transactions, provide regulated investment advice, or claim live bank synchronization without verified consent and Account Aggregator integration.
          </p>
          <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-2">
            <p>&copy; {new Date().getFullYear()} PaisaPilot. Built for financial clarity in India.</p>
            <div className="flex space-x-6">
              <Link href="/privacy" className="hover:underline">Privacy</Link>
              <Link href="/terms" className="hover:underline">Terms</Link>
              <Link href="/security" className="hover:underline">Security</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

