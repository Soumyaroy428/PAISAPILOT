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

  // Fresh / empty state check
  if (context.totalTransactionsCount === 0) {
    const msg = `You're in a clean starting position for ${context.periodLabel}!

Right now, you haven't recorded any income or expenses yet, so your entire monthly budget of ${formatPaiseToINR(context.monthlyBudgetPaise)} is completely intact and available. Across your active accounts, your liquid balance is currently ${formatPaiseToINR(context.reconciledBalancePaise)}.

Whenever you're ready, you can add your first transaction or import a bank statement. As soon as you do, I'll automatically break down your spending habits, track your savings rate, and help keep you within your targets.`;

    return {
      message: msg,
      suggestedFollowUps: [
        "How do I import a bank statement?",
        "Can I afford a ₹5,000 purchase right now?",
        "What is my monthly budget?",
      ],
    };
  }

  if (intent === "affordability_query") {
    const targetAmountPaise = extractRupeeAmountFromPrompt(prompt);

    if (targetAmountPaise) {
      const formattedTarget = formatPaiseToINR(targetAmountPaise);
      const remainingAfterPurchase = context.reconciledBalancePaise - targetAmountPaise;
      const budgetHeadroomAfter = context.budgetRemainingPaise - targetAmountPaise;

      let msg = "";
      if (targetAmountPaise > context.reconciledBalancePaise) {
        msg = `I wouldn't recommend making this purchase right now. Spending ${formattedTarget} exceeds your entire available balance of ${formatPaiseToINR(context.reconciledBalancePaise)}, which would put you in a negative cash deficit. It's safer to build up a small cash reserve first before taking on this expense.`;
      } else if (budgetHeadroomAfter < 0) {
        const overBudget = formatPaiseToINR(Math.abs(budgetHeadroomAfter));
        msg = `You have enough cash in your accounts (${formatPaiseToINR(context.reconciledBalancePaise)}) to pay for ${formattedTarget}, but proceed with caution: this purchase would exceed your remaining monthly budget headroom of ${formatPaiseToINR(context.budgetRemainingPaise)} by ${overBudget}. If it isn't urgent, you might want to wait until next month or trim down other expenses to stay on track.`;
      } else {
        msg = `Good news — you can comfortably afford this! Spending ${formattedTarget} fits easily within your available cash of ${formatPaiseToINR(context.reconciledBalancePaise)} and leaves you with ${formatPaiseToINR(budgetHeadroomAfter)} remaining in your monthly budget. You'll still have a healthy ${formatPaiseToINR(remainingAfterPurchase)} in your accounts after the purchase.`;
      }

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
    if (context.topCategories.length === 0) {
      return {
        message: `You don't have any categorized expenses recorded for ${context.periodLabel} yet. As soon as you add or import your expenses, I'll show you exactly how much you're spending across food, rent, shopping, and bills.`,
        suggestedFollowUps: [
          "How do I add a new category?",
          "Show my financial summary",
          "Can I afford a ₹10,000 purchase?",
        ],
      };
    }

    const topList = context.topCategories
      .map(
        (c) =>
          `• ${c.name}: ${formatPaiseToINR(c.amountPaise)} (${c.percent.toFixed(1)}% of spending)`
      )
      .join("\n");

    const msg = `Here is where your money has gone during ${context.periodLabel}. You've spent a total of ${formatPaiseToINR(context.totalExpensePaise)} across ${context.totalTransactionsCount} transactions:

${topList}

Your highest expense is ${context.topCategories[0].name}, making up ${context.topCategories[0].percent.toFixed(1)}% of everything you spent this period.`;

    return {
      message: msg,
      suggestedFollowUps: [
        `How can I cut down on ${context.topCategories[0].name}?`,
        "Can I afford a ₹10,000 purchase this month?",
        "What is my current savings rate?",
      ],
    };
  }

  if (intent === "savings_optimization") {
    const topBurn = context.topCategories[0];
    const topBurnAdvice = topBurn
      ? `Your biggest outflow right now is ${topBurn.name} at ${formatPaiseToINR(topBurn.amountPaise)}. Trimming just 10% from this category would give you an extra ${formatPaiseToINR(Math.round(topBurn.amountPaise * 0.1))} in savings every month.`
      : "Try logging a few days of daily expenses to give us a clear baseline of your spending.";

    const msg = `Here is how your savings look for ${context.periodLabel}:

Your current savings rate is ${context.savingsRatePercent.toFixed(1)}% with a net cash flow of ${formatPaiseToINR(context.netCashflowPaise)}. ${isBudgetExceeded ? "You are currently running over your monthly budget limit." : isBudgetWarning ? "You are getting close to your monthly spending limit." : "You are staying comfortably within your budget."}

Here are three simple ways you can boost your savings:
1. Target your biggest spend: ${topBurnAdvice}
2. Review recurring subscriptions: Check for any streaming services, gym memberships, or app subscriptions you haven't used recently.
3. Build your emergency safety net: Try to keep at least 3 months of basic living expenses (${formatPaiseToINR(context.totalExpensePaise * 3)}) tucked away in liquid savings for peace of mind.`;

    return {
      message: msg,
      suggestedFollowUps: [
        "What are my top 3 expense categories?",
        "Can I afford a ₹15,000 vacation expense?",
        "Show my financial summary for this month",
      ],
    };
  }

  // Default Financial Summary in human conversational sentences
  let budgetSentence = "";
  if (isBudgetExceeded) {
    budgetSentence = `You've spent ${formatPaiseToINR(context.totalExpensePaise)} so far, which is higher than your ${formatPaiseToINR(context.monthlyBudgetPaise)} monthly budget.`;
  } else if (isBudgetWarning) {
    budgetSentence = `You've utilized ${context.budgetUtilizationPercent.toFixed(1)}% of your monthly budget, with ${formatPaiseToINR(context.budgetRemainingPaise)} left to spend safely.`;
  } else {
    budgetSentence = `You're comfortably within budget, having used only ${context.budgetUtilizationPercent.toFixed(1)}% of your ${formatPaiseToINR(context.monthlyBudgetPaise)} limit. You still have ${formatPaiseToINR(context.budgetRemainingPaise)} in spending headroom.`;
  }

  const msg = `Here is a clear snapshot of your finances for ${context.periodLabel}:

${budgetSentence}

In total, you've brought in ${formatPaiseToINR(context.totalIncomePaise)} in income and spent ${formatPaiseToINR(context.totalExpensePaise)}, leaving you with a net cash flow of ${formatPaiseToINR(context.netCashflowPaise)} and a healthy savings rate of ${context.savingsRatePercent.toFixed(1)}%. Across all your payment accounts, your current liquid balance stands at ${formatPaiseToINR(context.reconciledBalancePaise)}.`;

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
