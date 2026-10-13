import Link from "next/link";
import {
  UserCheck,
  FileUp,
  Eye,
  BarChart3,
  Bot,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";

export default function HowItWorksPage() {
  const steps = [
    {
      step: "01",
      icon: UserCheck,
      title: "Register & Persona Onboarding",
      description:
        "Create your account with email and password. A step-by-step onboarding quiz asks for your persona (Student, Professional, Freelancer, Family, Business) to calibrate category defaults and initial budgets.",
    },
    {
      step: "02",
      icon: FileUp,
      title: "Upload Statement or Add Transactions",
      description:
        "Upload your SBI bank statement in PDF or CSV format, or enter manual cash/UPI expenses with full description, payment source, and category tags.",
    },
    {
      step: "03",
      icon: Eye,
      title: "Preview, Validate & Deduplicate",
      description:
        "Inspect parsed rows in a temporary preview table before committing. Spot unrecognized rows, duplicate alerts, or miscategorized items and correct them in place.",
    },
    {
      step: "04",
      icon: BarChart3,
      title: "Explore Dashboards & Spending Trends",
      description:
        "View accurate income, expense, and net cash-flow charts computed using integer paise. Filter by date ranges (this month, previous month, last 90 days) without math drift.",
    },
    {
      step: "05",
      icon: Bot,
      title: "Ask Grounded AI Intelligence",
      description:
        "Query the assistant to explain your financial patterns. The AI relies solely on authenticated backend calculators, ensuring zero fabricated numbers.",
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="secondary" className="px-3 py-1">Step-by-Step Workflow</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          How PaisaPilot Works
        </h1>
        <p className="text-lg text-muted-foreground">
          A transparent, privacy-first journey from raw bank statements to actionable financial intelligence.
        </p>
      </div>

      <div className="relative border-l-2 border-primary/20 ml-4 md:ml-32 space-y-12">
        {steps.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="relative pl-8 md:pl-12 group">
              {/* Step indicator node */}
              <div className="absolute -left-[17px] top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-primary text-xs font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {item.step}
              </div>

              <Card className="border-border">
                <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-primary text-primary-foreground p-8 md:p-12 text-center space-y-4">
        <h3 className="text-2xl md:text-3xl font-bold">Start simplifying your finances today</h3>
        <p className="text-primary-foreground/90 max-w-xl mx-auto text-sm leading-relaxed">
          No bank logins or credit card numbers needed. Get started in minutes.
        </p>
        <div className="pt-2">
          <Link href="/register">
            <Button size="lg" variant="secondary" className="font-semibold shadow-md">
              Create Your Free Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

