import { GoogleGenAI } from "@google/genai";
import {
  AssistantIntent,
  AssistantMessage,
  AssistantResponsePayload,
  AssistantContextData,
} from "@/server/models/assistant";
import {
  buildAssistantContext,
  formatSystemInstructions,
} from "@/server/services/assistant-context.service";
import { formatPaiseToINR } from "@/client/lib/utils";
import { AnalyticsPeriod } from "@/server/services/analytics.service";

/**
 * Sanitizes user input to prevent prompt injection and system instruction override.
 */
export function sanitizeUserPrompt(raw: string): string {
  let cleaned = raw
    .replace(/<[^>]*>/g, "") // strip HTML/XML tags
    .replace(/(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules)/gi, "")
    .replace(/(?:system\s*prompt|system\s*instruction|you\s*are\s*now\s*a)/gi, "")
    .trim();

  // Enforce max length
  if (cleaned.length > 800) {
    cleaned = cleaned.slice(0, 800);
  }

  return cleaned || "Financial status summary";
}

/**
 * Detects query intent from prompt keywords.
 */
export function detectIntent(prompt: string): AssistantIntent {
  const lower = prompt.toLowerCase();

  if (
    lower.includes("afford") ||
    lower.includes("can i buy") ||
    lower.includes("should i buy") ||
    lower.includes("can i spend") ||
    lower.includes("can i get") ||
    lower.includes("purchase of")
  ) {
    return "affordability_query";
  }

  if (
    lower.includes("category") ||
    lower.includes("categories") ||
    lower.includes("breakdown") ||
    lower.includes("where is my money going") ||
    lower.includes("spending on") ||
    lower.includes("top spend")
  ) {
    return "spending_breakdown";
  }

  if (
    lower.includes("save") ||
    lower.includes("saving") ||
    lower.includes("cut down") ||
    lower.includes("reduce") ||
    lower.includes("optimize") ||
    lower.includes("tips") ||
    lower.includes("improve")
  ) {
    return "savings_optimization";
  }

  if (
    lower.includes("summary") ||
    lower.includes("overview") ||
    lower.includes("status") ||
    lower.includes("balance") ||
    lower.includes("how am i doing") ||
    lower.includes("cash flow") ||
    lower.includes("inflow") ||
    lower.includes("outflow")
  ) {
    return "financial_summary";
  }

  return "general_inquiry";
}

/**
 * Parses any rupee amount specified in user query (e.g., "₹15,000", "15000", "50k", "2 lakh").
 */
export function extractRupeeAmountFromPrompt(prompt: string): number | null {
  // Check for lakh: "1.5 lakh", "2 lakhs"
  const lakhMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)s?/i);
  if (lakhMatch && lakhMatch[1]) {
    return Math.round(parseFloat(lakhMatch[1]) * 100000 * 100);
  }

  // Check for k / thousand: "15k", "20 thousand"
  const kMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:k\b|thousand)/i);
  if (kMatch && kMatch[1]) {
    return Math.round(parseFloat(kMatch[1]) * 1000 * 100);
  }

  // Check for rupee amount: "₹15,000" or "Rs 15000"
  const rupeeMatch = prompt.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i);
  if (rupeeMatch && rupeeMatch[1]) {
    const rawNum = rupeeMatch[1].replace(/,/g, "");
    const val = parseFloat(rawNum);
    if (!isNaN(val) && val > 0) return Math.round(val * 100);
  }

  // Check for standalone numbers > 100
  const numMatch = prompt.match(/\b([1-9]\d{2,}(?:,\d{2,})*)\b/);
  if (numMatch && numMatch[1]) {
    const rawNum = numMatch[1].replace(/,/g, "");
    const val = parseFloat(rawNum);
    if (!isNaN(val) && val > 0) return Math.round(val * 100);
  }

  return null;
}

/**
 * Generates verified, zero-hallucination response using deterministic calculations.
 * Used as fallback or standalone zero-dependency execution engine.
 */
export function generateGroundedDeterministicResponse(
  prompt: string,
  intent: AssistantIntent,
  context: AssistantContextData
): { message: string; suggestedFollowUps: string[] } {
  const isBudgetExceeded = context.budgetUtilizationPercent > 100;
  const isBudgetWarning = context.budgetUtilizationPercent > 80 && !isBudgetExceeded;

  if (intent === "affordability_query") {
    const targetAmountPaise = extractRupeeAmountFromPrompt(prompt);

    if (targetAmountPaise) {
      const formattedTarget = formatPaiseToINR(targetAmountPaise);
      const remainingAfterPurchase = context.reconciledBalancePaise - targetAmountPaise;
      const budgetHeadroomAfter = context.budgetRemainingPaise - targetAmountPaise;

      let verdict = "";
      if (targetAmountPaise > context.reconciledBalancePaise) {
        verdict = `❌ **Not Recommended Right Now**: This purchase (${formattedTarget}) exceeds your total available liquidity of ${formatPaiseToINR(context.reconciledBalancePaise)}. Attempting this would result in an immediate cash deficit.`;
      } else if (budgetHeadroomAfter < 0) {
        verdict = `⚠️ **Proceed With Caution**: You have sufficient liquidity (${formatPaiseToINR(context.reconciledBalancePaise)}), but this purchase (${formattedTarget}) will exceed your monthly budget headroom of ${formatPaiseToINR(context.budgetRemainingPaise)} by ${formatPaiseToINR(Math.abs(budgetHeadroomAfter))}.`;
      } else {
        verdict = `✅ **Comfortably Affordable**: You have sufficient liquidity (${formatPaiseToINR(context.reconciledBalancePaise)}) and sufficient remaining budget headroom (${formatPaiseToINR(context.budgetRemainingPaise)}). After this purchase, you will retain **${formatPaiseToINR(remainingAfterPurchase)}** in cash reserves.`;
      }

      const msg = `### Affordability Assessment for ${formattedTarget}

${verdict}

**Financial Position Check:**
- **Current Liquid Balance:** ${formatPaiseToINR(context.reconciledBalancePaise)}
- **Monthly Budget Headroom Remaining:** ${formatPaiseToINR(context.budgetRemainingPaise)}
- **Period Net Cash Flow:** ${formatPaiseToINR(context.netCashflowPaise)}
- **Estimated Reserve After Purchase:** ${formatPaiseToINR(Math.max(0, remainingAfterPurchase))}

*Tip: Consider spacing large non-essential purchases if you anticipate upcoming recurring bill commitments or tax payments.*`;

      return {
        message: msg,
        suggestedFollowUps: [
          "What are my highest expense categories this month?",
          "How can I optimize my monthly savings rate?",
          "Show me my overall financial summary",
        ],
      };
    }
  }

  if (intent === "spending_breakdown") {
    const catList =
      context.topCategories.length > 0
        ? context.topCategories
            .map(
              (c, i) =>
                `${i + 1}. **${c.name}**: ${formatPaiseToINR(c.amountPaise)} (${c.percent.toFixed(1)}% of total outflows)`
            )
            .join("\n")
        : "No categorized expenses recorded in this period yet.";

    const msg = `### Spending Breakdown (${context.periodLabel})

Here is how your outflows are distributed across verified categories:

${catList}

**Summary Statistics:**
- **Total Period Outflows:** ${formatPaiseToINR(context.totalExpensePaise)}
- **Transactions Recorded:** ${context.totalTransactionsCount}
- **Data Coverage:** ${context.dataCoverage}

*Note: Internal inter-account transfers are strictly excluded from outflows to prevent double counting.*`;

    return {
      message: msg,
      suggestedFollowUps: [
        "How can I cut down on my top spending category?",
        "Can I afford a ₹10,000 purchase this month?",
        "What is my current savings rate?",
      ],
    };
  }

  if (intent === "savings_optimization") {
    const topBurn = context.topCategories[0];
    const topBurnText = topBurn
      ? `Your largest outflow is **${topBurn.name}** at ${formatPaiseToINR(topBurn.amountPaise)} (${topBurn.percent.toFixed(1)}% of expenses). Reducing this by 10% would save an extra **${formatPaiseToINR(Math.round(topBurn.amountPaise * 0.1))}** per period.`
      : "Start by tracking your daily expenses to establish an accurate spending baseline.";

    const msg = `### Savings & Cash Flow Optimization

**Current Performance:**
- **Savings Rate:** **${context.savingsRatePercent.toFixed(1)}%** (Target: 20-30% for sustainable wealth building)
- **Net Inflow vs Outflow:** ${formatPaiseToINR(context.netCashflowPaise)}
- **Budget Utilization:** ${context.budgetUtilizationPercent.toFixed(1)}% (${isBudgetExceeded ? "⚠️ Over budget" : isBudgetWarning ? "⚡ Approaching limit" : "✅ On track"})

**Actionable Insights:**
1. **Target the Largest Burn:** ${topBurnText}
2. **Review Recurring Subscriptions:** Audit digital subscriptions, OTT, and utility recharges.
3. **Emergency Fund Buffer:** Strive to maintain at least 3-6 months of essential living expenses (${formatPaiseToINR(context.totalExpensePaise * 3)}) in liquid accounts or high-yield savings.`;

    return {
      message: msg,
      suggestedFollowUps: [
        "What are my top 3 expense categories?",
        "Can I afford a ₹15,000 vacation expense?",
        "Show my financial summary for this month",
      ],
    };
  }

  // Default Financial Summary
  const statusBadge = isBudgetExceeded
    ? "⚠️ **Budget Exceeded**"
    : isBudgetWarning
    ? "⚡ **Approaching Budget Limit**"
    : "✅ **Healthy & Within Limits**";

  const msg = `### Financial Snapshot (${context.periodLabel})

${statusBadge}

**Key Metrics (Integer Paise Precision):**
- **Total Inflows (Income):** ${formatPaiseToINR(context.totalIncomePaise)}
- **Total Outflows (Expenses):** ${formatPaiseToINR(context.totalExpensePaise)}
- **Net Cash Flow:** ${formatPaiseToINR(context.netCashflowPaise)}
- **Reconciled Liquidity (All Accounts):** ${formatPaiseToINR(context.reconciledBalancePaise)}
- **Monthly Budget Headroom:** ${formatPaiseToINR(context.budgetRemainingPaise)} remaining of ${formatPaiseToINR(context.monthlyBudgetPaise)} (${context.budgetUtilizationPercent.toFixed(1)}% utilized)
- **Savings Rate:** **${context.savingsRatePercent.toFixed(1)}%**

**Data Scope:**
*${context.dataCoverage}. All inter-account transfers are strictly excluded from P&L calculations.*`;

  return {
    message: msg,
    suggestedFollowUps: [
      "What are my highest expense categories?",
      "Can I afford a ₹15,000 purchase right now?",
      "How can I improve my savings rate?",
    ],
  };
}

/**
 * Main AI Assistant Entrypoint.
 * Connects to Gemini API with strict system grounding or falls back seamlessly to deterministic engine.
 */
export async function askAssistant(
  userId: string,
  userPrompt: string,
  history: AssistantMessage[] = [],
  period: AnalyticsPeriod = "this_month"
): Promise<AssistantResponsePayload> {
  const sanitizedPrompt = sanitizeUserPrompt(userPrompt);
  const intent = detectIntent(sanitizedPrompt);
  const context = await buildAssistantContext(userId, period);

  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = formatSystemInstructions(context);

      // Build conversation contents
      const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

      // Add recent history (up to last 4 turns)
      for (const msg of history.slice(-4)) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: sanitizeUserPrompt(msg.content) }],
        });
      }

      // Add current turn
      contents.push({
        role: "user",
        parts: [{ text: sanitizedPrompt }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature for factual precision
          maxOutputTokens: 1200,
        },
      });

      if (response && response.text) {
        // Generate follow ups
        const followUps = [
          "What are my highest expense categories?",
          "Can I afford a ₹12,000 purchase this month?",
          "How is my savings rate compared to my budget target?",
        ];

        return {
          message: response.text,
          intent,
          context,
          suggestedFollowUps: followUps,
          engine: "gemini-api",
        };
      }
    } catch (err: any) {
      console.warn("Gemini API call failed or timed out, activating grounded deterministic engine:", err.message);
    }
  }

  // Grounded Deterministic Fallback
  const deterministic = generateGroundedDeterministicResponse(
    sanitizedPrompt,
    intent,
    context
  );

  return {
    message: deterministic.message,
    intent,
    context,
    suggestedFollowUps: deterministic.suggestedFollowUps,
    engine: "grounded-deterministic",
  };
}
