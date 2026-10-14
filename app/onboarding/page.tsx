"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Briefcase,
  Laptop,
  Users,
  Store,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertCircle,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/client/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/client/components/ui/Card";
import { Badge } from "@/client/components/ui/Badge";
import { PersonaType } from "@/server/models/user";

interface PersonaOption {
  id: PersonaType;
  title: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  defaultBudget: number; // in INR
}

const PERSONAS: PersonaOption[] = [
  {
    id: "student",
    title: "Student / Campus",
    tagline: "Pocket Money & Campus Living",
    description: "Keep track of hostel dues, canteen expenses, shared flat bills, and student allowances.",
    icon: GraduationCap,
    defaultBudget: 8000,
  },
  {
    id: "young_professional",
    title: "Young Professional",
    tagline: "Early Career & Salaried",
    description: "Manage monthly rent, salary allocation, SIPs, weekend outings, and credit card dues.",
    icon: Briefcase,
    defaultBudget: 35000,
  },
  {
    id: "freelancer",
    title: "Freelancer / Consultant",
    tagline: "Variable Inflows & Gig Work",
    description: "Tame irregular client payments, quarterly advance tax, business software, and rainy-day funds.",
    icon: Laptop,
    defaultBudget: 45000,
  },
  {
    id: "family",
    title: "Family Household",
    tagline: "Multi-Earner & Home Budgets",
    description: "Coordinate school tuition, groceries, EMIs, household staff, and collective family savings.",
    icon: Users,
    defaultBudget: 65000,
  },
  {
    id: "small_business",
    title: "Small Business / Merchant",
    tagline: "Commercial Cashflow & Inventory",
    description: "Separate business vs personal cash, track supplier payouts, GST, and daily collections.",
    icon: Store,
    defaultBudget: 85000,
  },
];

const COMMITMENT_OPTIONS = [
  { id: "rent", label: "House Rent / PG" },
  { id: "emi", label: "Loan EMIs (Home/Auto/Personal)" },
  { id: "utilities", label: "Electricity / Water / Wi-Fi" },
  { id: "groceries", label: "Monthly Groceries & Milk" },
  { id: "education", label: "Tuition / School Fees" },
  { id: "insurance", label: "Health / Term Insurance" },
  { id: "subscriptions", label: "OTT & Cloud Subscriptions" },
  { id: "staff", label: "Domestic Help / Cook" },
];

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI (GPay / PhonePe / Paytm)" },
  { id: "credit_card", label: "Credit Cards" },
  { id: "debit_card", label: "Debit Cards / Netbanking" },
  { id: "cash", label: "Cash / Daily Currency" },
];

export default function OnboardingPage() {
  const router = useRouter();

  // Step indicator: 1 = Persona, 2 = Inflow/Source, 3 = Commitments & Methods, 4 = Budget & Target
  const [step, setStep] = React.useState<number>(1);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [selectedPersona, setSelectedPersona] = React.useState<PersonaType>("young_professional");
  const [incomeBand, setIncomeBand] = React.useState<string>("25k_to_50k");
  const [primaryInflowSource, setPrimaryInflowSource] = React.useState<string>("salary");
  const [commitments, setCommitments] = React.useState<string[]>(["rent", "utilities", "groceries"]);
  const [paymentMethods, setPaymentMethods] = React.useState<string[]>(["upi", "credit_card"]);
  const [monthlyBudgetInr, setMonthlyBudgetInr] = React.useState<number>(35000);
  const [savingsTargetPercent, setSavingsTargetPercent] = React.useState<number>(20);

  // Check auth session on mount
  React.useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login?redirect=/onboarding");
          return;
        }
        const data = await res.json();
        // If already completed onboarding, redirect to dashboard
        if (data.data?.user?.onboardingCompleted) {
          router.push("/dashboard");
          return;
        }
      } catch {
        router.push("/login");
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  // Update default budget when persona changes
  const handlePersonaSelect = (personaId: PersonaType) => {
    setSelectedPersona(personaId);
    const persona = PERSONAS.find((p) => p.id === personaId);
    if (persona) {
      setMonthlyBudgetInr(persona.defaultBudget);
    }
  };

  const toggleCommitment = (id: string) => {
    setCommitments((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const togglePaymentMethod = (id: string) => {
    setPaymentMethods((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    setError(null);
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Submit completed quiz
  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        persona: selectedPersona,
        incomeBand,
        primaryInflowSource,
        fixedCommitments: commitments,
        primaryPaymentMethods: paymentMethods,
        // Convert INR to integer paise (1 INR = 100 paise)
        monthlyBudgetPaise: Math.round(Number(monthlyBudgetInr) * 100),
        savingsTargetPercent: Number(savingsTargetPercent),
      };

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save onboarding details.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  // Skip onboarding
  const handleSkip = async () => {
    setLoading(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skip: true }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch {
      router.push("/dashboard");
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Preparing your setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Top Header & Skip Option */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-border mb-8">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
              Step {step} of 4
            </Badge>
            <span className="text-xs text-muted-foreground">Personalized Finance Setup</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
            Configure Your PaisaPilot Experience
          </h1>
        </div>
        <button
          onClick={handleSkip}
          disabled={loading}
          className="self-start sm:self-auto text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-4 disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-1.5 mb-8 overflow-hidden">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-2 text-sm text-rose-800 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Select Persona */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xl font-semibold">Which persona best describes your financial lifestyle?</h2>
            <p className="text-sm text-muted-foreground">
              PaisaPilot will tune your default categories, cash-flow benchmarks, and budget alerts specifically for this archetype.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPersona === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handlePersonaSelect(p.id)}
                  className={`relative p-5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                      : "border-border hover:border-foreground/30 bg-card hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-2.5 rounded-lg ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground text-base">{p.title}</h3>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </div>
                      <p className="text-xs font-medium text-primary">{p.tagline}</p>
                      <p className="text-xs text-muted-foreground pt-1 leading-relaxed">{p.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: Inflow & Primary Source */}
      {step === 2 && (
        <div className="space-y-6 max-w-xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Your Inflow & Earnings Structure</h2>
            <p className="text-sm text-muted-foreground">
              Help PaisaPilot predict monthly cash availability and calculate safe-to-spend limits.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Monthly Inflow / Salary Band</label>
              <select
                value={incomeBand}
                onChange={(e) => setIncomeBand(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="under_15k">Up to ₹15,000 / month (Allowance / Part-time)</option>
                <option value="15k_to_30k">₹15,000 – ₹30,000 / month</option>
                <option value="30k_to_60k">₹30,000 – ₹60,000 / month</option>
                <option value="60k_to_1_2L">₹60,000 – ₹1,20,000 / month</option>
                <option value="1_2L_to_2_5L">₹1,20,000 – ₹2,50,000 / month</option>
                <option value="above_2_5L">Above ₹2,50,000 / month</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Primary Income Source</label>
              <select
                value={primaryInflowSource}
                onChange={(e) => setPrimaryInflowSource(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="salary">Fixed Monthly Salary (Direct Deposit)</option>
                <option value="client_invoices">Client Invoices / Variable Freelance</option>
                <option value="business_revenue">Business Daily Inflows / Merchant Sales</option>
                <option value="parental_allowance">Family / Parental Pocket Money</option>
                <option value="investments">Investments / Rental Income</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Fixed Commitments & Payment Habits */}
      {step === 3 && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Commitments & Payment Habits</h2>
            <p className="text-sm text-muted-foreground">
              Select recurring commitments and primary modes of payment you use day-to-day.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Monthly Fixed Commitments (Select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COMMITMENT_OPTIONS.map((c) => {
                  const checked = commitments.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleCommitment(c.id)}
                      className={`p-3 rounded-lg border text-sm flex items-center justify-between cursor-pointer transition-colors ${
                        checked
                          ? "border-primary bg-primary/5 text-foreground font-medium"
                          : "border-border text-muted-foreground hover:bg-accent/40"
                      }`}
                    >
                      <span>{c.label}</span>
                      {checked && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Primary Payment Methods Used
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map((m) => {
                  const checked = paymentMethods.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => togglePaymentMethod(m.id)}
                      className={`p-3 rounded-lg border text-sm flex items-center justify-between cursor-pointer transition-colors ${
                        checked
                          ? "border-primary bg-primary/5 text-foreground font-medium"
                          : "border-border text-muted-foreground hover:bg-accent/40"
                      }`}
                    >
                      <span>{m.label}</span>
                      {checked && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Monthly Spending Cap & Target */}
      {step === 4 && (
        <div className="space-y-6 max-w-xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Target Budget & Monthly Discipline</h2>
            <p className="text-sm text-muted-foreground">
              Define a provisional monthly expense ceiling. You can fine-tune specific category limits anytime in your dashboard.
            </p>
          </div>

          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="budget">
                Monthly Target Expense Budget (₹ INR)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  id="budget"
                  type="number"
                  min={1000}
                  step={500}
                  value={monthlyBudgetInr}
                  onChange={(e) => setMonthlyBudgetInr(Number(e.target.value))}
                  placeholder="35000"
                  className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Integer paise precision: Automatically converted server-side to ₹{(monthlyBudgetInr || 0).toLocaleString("en-IN")}.00.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-sm font-medium">
                <label htmlFor="savings">Target Savings / Buffer Rate</label>
                <span className="text-primary font-bold">{savingsTargetPercent}%</span>
              </div>
              <input
                id="savings"
                type="range"
                min={0}
                max={60}
                step={5}
                value={savingsTargetPercent}
                onChange={(e) => setSavingsTargetPercent(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% (Tight Month)</span>
                <span>20% (Balanced)</span>
                <span>40%+ (Aggressive Savings)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-xs text-muted-foreground mt-4">
              <div className="flex items-center space-x-1.5 font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Automatic Category Initialization</span>
              </div>
              <p>
                Finishing this setup will automatically generate category presets tailored for{" "}
                <span className="font-semibold text-foreground">
                  {PERSONAS.find((p) => p.id === selectedPersona)?.title}
                </span>{" "}
                with zero manual setup required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-10 mt-8 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={step === 1 || loading}
          className="font-medium"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {step < 4 ? (
          <Button type="button" onClick={handleNext} className="font-semibold">
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleFinish}
            disabled={loading}
            className="font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing Setup...
              </>
            ) : (
              <>
                Complete Onboarding & Enter Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>

      <div className="pt-6 flex items-center justify-center space-x-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>Your financial preferences are stored in your private encrypted profile</span>
      </div>
    </div>
  );
}

