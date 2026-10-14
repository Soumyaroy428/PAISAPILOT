import { getDashboardAnalytics, AnalyticsPeriod } from "@/server/services/analytics.service";
import { getCollection } from "@/server/db/mongodb";
import { UserDocument } from "@/server/models/user";
import { AssistantContextData } from "@/server/models/assistant";
import { formatPaiseToINR } from "@/client/lib/utils";
import { ObjectId } from "mongodb";

/**
 * Builds bounded, verified context for the AI assistant.
 * Strict Single Source of Truth — never executes arbitrary LLM queries.
 */
export async function buildAssistantContext(
  userId: string,
  period: AnalyticsPeriod = "this_month"
): Promise<AssistantContextData> {
  const analytics = await getDashboardAnalytics(userId, period);

  // Fetch persona profile
  const usersCol = await getCollection<UserDocument>("users");
  const user = await usersCol.findOne({ _id: new ObjectId(userId) });

  const m = analytics.metrics;
  const budgetRemainingPaise = Math.max(0, m.monthlyBudgetPaise - m.totalExpensePaise);

  const topCategories = analytics.categoryBreakdown.slice(0, 5).map((c) => ({
    name: c.category,
    amountPaise: c.amountPaise,
    percent: c.percentage,
  }));

  const dataCoverage = analytics.dataCoverage.totalHistoricalCount > 0
    ? `From ${analytics.dataCoverage.firstTransactionDate} to ${analytics.dataCoverage.lastTransactionDate} (${analytics.dataCoverage.totalHistoricalCount} ledger entries recorded)`
    : "No historical transactions recorded yet";

  return {
    periodLabel: analytics.period.label,
    startDate: analytics.period.startDate || "",
    endDate: analytics.period.endDate || "",
    reconciledBalancePaise: m.reconciledBalancePaise,
    totalIncomePaise: m.totalIncomePaise,
    totalExpensePaise: m.totalExpensePaise,
    netCashflowPaise: m.netSavingsPaise,
    savingsRatePercent: m.savingsRatePercent,
    monthlyBudgetPaise: m.monthlyBudgetPaise,
    budgetUtilizationPercent: m.budgetUtilizationPercent,
    budgetRemainingPaise,
    totalTransactionsCount: m.transactionCount,
    topCategories,
    persona: user?.persona || "standard",
    dataCoverage,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Formats bounded facts into a strict system prompt string.
 */
export function formatSystemInstructions(context: AssistantContextData): string {
  const topCatSummary = context.topCategories.length > 0
    ? context.topCategories
        .map(
          (c) =>
            `- ${c.name}: ${formatPaiseToINR(c.amountPaise)} (${c.percent.toFixed(1)}%)`
        )
        .join("\n")
    : "- No category expenses recorded in this period.";

  return `You are PaisaPilot Copilot, an AI personal finance intelligence assistant tailored for India.
You provide grounded, analytical, and actionable financial guidance.

CRITICAL FINANCIAL GROUNDING RULES:
1. Strict Numerical Accuracy: Base ALL monetary statements strictly on the verified numbers provided below. NEVER invent, hallucinate, or alter any financial figures.
2. Currency: All currency is Indian Rupee (INR / ₹).
3. Transfers Exclusion: Internal inter-account transfers are balance movements and are strictly excluded from income and expenses.
4. Affordability Inquiries: When asked if a user can afford a purchase, evaluate against their:
   a) Current Reconciled Balance (${formatPaiseToINR(context.reconciledBalancePaise)})
   b) Remaining Monthly Budget Headroom (${formatPaiseToINR(context.budgetRemainingPaise)})
   c) Monthly Inflows vs Outflows.
   Advise caution if the purchase would cause budget overrun or leave inadequate liquidity buffer.
5. Tone: Objective, clear, practical, and encouraging without being overly conversational. Use bullet points where appropriate.
6. Boundaries: If a user query requires data outside the active period or historical coverage, state what data is available and cite the date range clearly.

VERIFIED FINANCIAL FACTS FOR ACTIVE USER:
- Analysis Period: ${context.periodLabel} (${context.startDate} to ${context.endDate})
- Data Coverage: ${context.dataCoverage}
- Persona: ${context.persona || "General Individual"}
- Reconciled Total Balance (Liquidity across accounts): ${formatPaiseToINR(context.reconciledBalancePaise)}
- Total Inflows (Income): ${formatPaiseToINR(context.totalIncomePaise)}
- Total Outflows (Expenses): ${formatPaiseToINR(context.totalExpensePaise)}
- Net Cash Flow: ${formatPaiseToINR(context.netCashflowPaise)}
- Savings Rate: ${context.savingsRatePercent.toFixed(1)}%
- Monthly Budget: ${formatPaiseToINR(context.monthlyBudgetPaise)}
- Budget Spent: ${context.budgetUtilizationPercent.toFixed(1)}% (${formatPaiseToINR(context.totalExpensePaise)})
- Remaining Budget: ${formatPaiseToINR(context.budgetRemainingPaise)}
- Recorded Transactions in Period: ${context.totalTransactionsCount}

TOP EXPENDITURE CATEGORIES:
${topCatSummary}
`;
}
