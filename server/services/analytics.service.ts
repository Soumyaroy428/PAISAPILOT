import { ObjectId } from "mongodb";
import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import { TransactionDocument } from "@/server/models/transaction";
import { AccountDocument } from "@/server/models/account";
import { UserDocument } from "@/server/models/user";

export type AnalyticsPeriod =
  | "this_month"
  | "last_month"
  | "last_30_days"
  | "last_90_days"
  | "this_year"
  | "all_time"
  | "custom";

export interface PeriodDateRange {
  startDate?: Date;
  endDate?: Date;
  label: string;
}

export interface CategoryBreakdownItem {
  category: string;
  amountPaise: number;
  percentage: number;
  transactionCount: number;
}

export interface CashFlowTrendPoint {
  date: string; // YYYY-MM-DD
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
}

export interface DashboardAnalyticsResult {
  period: {
    type: AnalyticsPeriod;
    label: string;
    startDate?: string;
    endDate?: string;
  };
  metrics: {
    totalIncomePaise: number;
    totalExpensePaise: number;
    netSavingsPaise: number;
    savingsRatePercent: number;
    reconciledBalancePaise: number;
    monthlyBudgetPaise: number;
    budgetUtilizationPercent: number;
    transactionCount: number;
    transferCount: number;
  };
  trends: CashFlowTrendPoint[];
  categoryBreakdown: CategoryBreakdownItem[];
  recentTransactions: TransactionDocument[];
  dataCoverage: {
    firstTransactionDate?: string;
    lastTransactionDate?: string;
    totalHistoricalCount: number;
  };
}

/**
 * Resolves period enum into concrete start and end dates with day boundaries.
 */
export function resolvePeriodDateRange(
  period: AnalyticsPeriod = "this_month",
  customStart?: string,
  customEnd?: string
): PeriodDateRange {
  const now = new Date();

  switch (period) {
    case "this_month": {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthName = startDate.toLocaleString("en-IN", { month: "long", year: "numeric" });
      return { startDate, endDate, label: `This Month (${monthName})` };
    }
    case "last_month": {
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const monthName = startDate.toLocaleString("en-IN", { month: "long", year: "numeric" });
      return { startDate, endDate, label: `Last Month (${monthName})` };
    }
    case "last_30_days": {
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      return { startDate, endDate: now, label: "Last 30 Days" };
    }
    case "last_90_days": {
      const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      return { startDate, endDate: now, label: "Last 90 Days" };
    }
    case "this_year": {
      const startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { startDate, endDate, label: `This Year (${now.getFullYear()})` };
    }
    case "custom": {
      const startDate = customStart ? new Date(customStart) : undefined;
      let endDate: Date | undefined;
      if (customEnd) {
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      }
      return { startDate, endDate, label: "Custom Range" };
    }
    case "all_time":
    default:
      return { label: "All Time" };
  }
}

/**
 * Single source of truth calculation engine for financial analytics.
 * Computes exact integer paise metrics, category breakdowns, and cash flow trends.
 */
export async function getDashboardAnalytics(
  userId: string,
  periodType: AnalyticsPeriod = "this_month",
  customStart?: string,
  customEnd?: string
): Promise<DashboardAnalyticsResult> {
  await ensureDatabaseIndexes();
  const transactionsCol = await getCollection<TransactionDocument>("transactions");
  const accountsCol = await getCollection<AccountDocument>("accounts");
  const usersCol = await getCollection<UserDocument>("users");

  const dateRange = resolvePeriodDateRange(periodType, customStart, customEnd);

  // Construct query with strict user ownership
  const query: any = { userId };
  if (dateRange.startDate || dateRange.endDate) {
    query.transactionDate = {};
    if (dateRange.startDate) query.transactionDate.$gte = dateRange.startDate;
    if (dateRange.endDate) query.transactionDate.$lte = dateRange.endDate;
  }

  // Parallel data fetching for optimal latency
  const [
    userDoc,
    accounts,
    periodTransactions,
    firstTxn,
    lastTxn,
    totalHistoricalCount,
  ] = await Promise.all([
    usersCol.findOne({ _id: new ObjectId(userId) }),
    accountsCol.find({ userId, isArchived: false }).toArray(),
    transactionsCol
      .find(query)
      .sort({ transactionDate: -1, createdAt: -1 })
      .toArray(),
    transactionsCol
      .find({ userId })
      .sort({ transactionDate: 1 })
      .limit(1)
      .toArray(),
    transactionsCol
      .find({ userId })
      .sort({ transactionDate: -1 })
      .limit(1)
      .toArray(),
    transactionsCol.countDocuments({ userId }),
  ]);

  // Total Reconciled Liquidity across active accounts
  const reconciledBalancePaise = accounts.reduce(
    (acc, a) => acc + (a.currentBalancePaise || 0),
    0
  );

  // User monthly budget cap (from onboarding profile or default 35,000 INR)
  const monthlyBudgetPaise =
    userDoc?.onboardingProfile?.monthlyBudgetPaise || 3500000;

  // Single Source of Truth Metrics Calculation
  let totalIncomePaise = 0;
  let totalExpensePaise = 0;
  let transferCount = 0;

  const categoryMap = new Map<string, { amountPaise: number; count: number }>();
  const trendMap = new Map<string, { incomePaise: number; expensePaise: number }>();

  for (const txn of periodTransactions) {
    if (txn.type === "transfer") {
      transferCount++;
      // Internal transfers are excluded from income and expenses to avoid double-counting
      continue;
    }

    const dateKey = new Date(txn.transactionDate).toISOString().split("T")[0];

    // Initialize trend point
    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, { incomePaise: 0, expensePaise: 0 });
    }
    const trendPoint = trendMap.get(dateKey)!;

    if (txn.type === "income") {
      totalIncomePaise += txn.amountPaise;
      trendPoint.incomePaise += txn.amountPaise;
    } else if (txn.type === "expense") {
      totalExpensePaise += txn.amountPaise;
      trendPoint.expensePaise += txn.amountPaise;

      // Group by category
      const catName = txn.categoryName || "Uncategorized";
      const existingCat = categoryMap.get(catName) || { amountPaise: 0, count: 0 };
      existingCat.amountPaise += txn.amountPaise;
      existingCat.count += 1;
      categoryMap.set(catName, existingCat);
    }
  }

  const netSavingsPaise = totalIncomePaise - totalExpensePaise;
  const savingsRatePercent =
    totalIncomePaise > 0
      ? Math.max(-100, Math.min(100, Math.round((netSavingsPaise / totalIncomePaise) * 100)))
      : 0;

  const budgetUtilizationPercent =
    monthlyBudgetPaise > 0
      ? Math.round((totalExpensePaise / monthlyBudgetPaise) * 100)
      : 0;

  // Format Category Breakdown (sorted descending by spend)
  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amountPaise: data.amountPaise,
      percentage:
        totalExpensePaise > 0
          ? Math.round((data.amountPaise / totalExpensePaise) * 100)
          : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  // Format Cash Flow Trends (sorted ascending by date)
  const trends: CashFlowTrendPoint[] = Array.from(trendMap.entries())
    .map(([date, data]) => ({
      date,
      incomePaise: data.incomePaise,
      expensePaise: data.expensePaise,
      netPaise: data.incomePaise - data.expensePaise,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Recent 5 transactions
  const recentTransactions = periodTransactions.slice(0, 5);

  return {
    period: {
      type: periodType,
      label: dateRange.label,
      startDate: dateRange.startDate?.toISOString().split("T")[0],
      endDate: dateRange.endDate?.toISOString().split("T")[0],
    },
    metrics: {
      totalIncomePaise,
      totalExpensePaise,
      netSavingsPaise,
      savingsRatePercent,
      reconciledBalancePaise,
      monthlyBudgetPaise,
      budgetUtilizationPercent,
      transactionCount: periodTransactions.length,
      transferCount,
    },
    trends,
    categoryBreakdown,
    recentTransactions,
    dataCoverage: {
      firstTransactionDate: firstTxn[0]
        ? new Date(firstTxn[0].transactionDate).toISOString().split("T")[0]
        : undefined,
      lastTransactionDate: lastTxn[0]
        ? new Date(lastTxn[0].transactionDate).toISOString().split("T")[0]
        : undefined,
      totalHistoricalCount,
    },
  };
}

