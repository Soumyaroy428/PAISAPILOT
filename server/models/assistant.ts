import { z } from "zod";

export type AssistantRole = "user" | "assistant" | "system";

export type AssistantIntent =
  | "financial_summary"
  | "spending_breakdown"
  | "affordability_query"
  | "savings_optimization"
  | "general_inquiry";

export interface AssistantMessage {
  role: AssistantRole;
  content: string;
  timestamp?: string;
}

export interface AssistantContextCategory {
  name: string;
  amountPaise: number;
  percent: number;
}

export interface AssistantContextData {
  periodLabel: string;
  startDate: string;
  endDate: string;
  reconciledBalancePaise: number;
  totalIncomePaise: number;
  totalExpensePaise: number;
  netCashflowPaise: number;
  savingsRatePercent: number;
  monthlyBudgetPaise: number;
  budgetUtilizationPercent: number;
  budgetRemainingPaise: number;
  totalTransactionsCount: number;
  topCategories: AssistantContextCategory[];
  persona?: string;
  dataCoverage: string;
  verifiedAt: string;
}

export const AssistantQuerySchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Please enter a question or query.")
    .max(1000, "Query cannot exceed 1000 characters."),
  period: z
    .enum([
      "this_month",
      "last_month",
      "last_30_days",
      "last_90_days",
      "this_year",
      "all_time",
    ])
    .default("this_month"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .max(10, "Conversation history limited to recent 10 messages.")
    .optional(),
});

export type AssistantQueryInput = z.infer<typeof AssistantQuerySchema>;

export interface AssistantResponsePayload {
  message: string;
  intent: AssistantIntent;
  context: AssistantContextData;
  suggestedFollowUps: string[];
  engine: "gemini-api" | "grounded-deterministic";
}

