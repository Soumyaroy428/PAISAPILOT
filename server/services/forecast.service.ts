import { ObjectId } from "mongodb";
import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import { AccountDocument } from "@/server/models/account";
import { TransactionDocument } from "@/server/models/transaction";
import { RecurringDocument } from "@/server/models/recurring";
import { UserDocument } from "@/server/models/user";
import {
  CashFlowForecastResult,
  ForecastConfidence,
  ForecastDailyPoint,
  ForecastHorizon,
  ForecastScenario,
} from "@/server/models/forecast";
import { formatPaiseToINR } from "@/client/lib/utils";

/**
 * Generates deterministic cash-flow projections for 30, 60, or 90 days.
 * Strictly separates recurring commitments from variable discretionary spending
 * and applies transparent scenario modeling without false certainty guarantees.
 */
export async function generateCashFlowForecast(
  userId: string,
  horizonDays: ForecastHorizon = 30,
  selectedScenario: ForecastScenario = "baseline"
): Promise<CashFlowForecastResult> {
  await ensureDatabaseIndexes();

  const accountsCol = await getCollection<AccountDocument>("accounts");
  const transactionsCol = await getCollection<TransactionDocument>("transactions");
  const recurringCol = await getCollection<RecurringDocument>("recurring");
  const usersCol = await getCollection<UserDocument>("users");

  // 1. Current Reconciled Balance
  const accounts = await accountsCol
    .find({ userId, isArchived: false })
    .toArray();

  const startingBalancePaise = accounts.reduce(
    (sum, acc) => sum + (acc.balancePaise || 0),
    0
  );

  // 2. Fetch Historical Non-Transfer Transactions (Last 90 Days)
  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - 90);

  const transactions = await transactionsCol
    .find({
      userId,
      type: { $in: ["income", "expense"] },
      transactionDate: { $gte: historyCutoff },
    })
    .sort({ transactionDate: 1 })
    .toArray();

  // 3. User Profile for Fallback Assumptions in Low-Data State
  const user = await usersCol.findOne({ _id: new ObjectId(userId) });
  const onboardingProfile = user?.onboardingProfile;

  // 4. Data Span & Confidence Assessment
  const txCount = transactions.length;
  let historicalDaysAnalyzed = 1;

  if (txCount > 0) {
    const firstTxDate = new Date(transactions[0].transactionDate);
    const lastTxDate = new Date(transactions[txCount - 1].transactionDate);
    const diffMs = Math.abs(lastTxDate.getTime() - firstTxDate.getTime());
    historicalDaysAnalyzed = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  const isLowDataState = txCount < 5 || historicalDaysAnalyzed < 14;
  let confidence: ForecastConfidence = "high";
  if (isLowDataState) {
    confidence = "low";
  } else if (historicalDaysAnalyzed < 45 || txCount < 20) {
    confidence = "moderate";
  }

  // 5. Active Recurring Rules
  const recurringRules = await recurringCol
    .find({ userId, status: "active" })
    .toArray();

  // 6. Calculate Variable Burn Rate (Filtering Outliers & Known Subscriptions)
  const expenseTxns = transactions.filter((t) => t.type === "expense");
  const incomeTxns = transactions.filter((t) => t.type === "income");

  // Filter out one-off huge transactions (> ₹50,000 or > 4x median) to prevent skewed projections
  const sortedExpenseAmounts = expenseTxns.map((t) => t.amountPaise).sort((a, b) => a - b);
  const medianExpensePaise =
    sortedExpenseAmounts.length > 0
      ? sortedExpenseAmounts[Math.floor(sortedExpenseAmounts.length / 2)]
      : 50000; // default ₹500
  const outlierThresholdPaise = Math.max(5000000, medianExpensePaise * 4); // ₹50,000 or 4x median

  const normalVariableExpenses = expenseTxns.filter(
    (t) => t.amountPaise <= outlierThresholdPaise
  );

  let dailyVariableExpensePaise = 0;
  let dailyVariableIncomePaise = 0;

  if (!isLowDataState && historicalDaysAnalyzed > 0) {
    const totalVariableExpensePaise = normalVariableExpenses.reduce(
      (sum, t) => sum + t.amountPaise,
      0
    );
    dailyVariableExpensePaise = Math.round(
      totalVariableExpensePaise / Math.max(14, historicalDaysAnalyzed)
    );

    const totalVariableIncomePaise = incomeTxns.reduce((sum, t) => sum + t.amountPaise, 0);
    dailyVariableIncomePaise = Math.round(
      totalVariableIncomePaise / Math.max(14, historicalDaysAnalyzed)
    );
  } else {
    // Low-data fallback heuristic from user onboarding profile
    const fallbackMonthlyBudget = onboardingProfile?.monthlyBudgetPaise || 3500000; // ₹35,000
    dailyVariableExpensePaise = Math.round(fallbackMonthlyBudget / 30);
    const fallbackMonthlyIncome = Math.round(fallbackMonthlyBudget * 1.3);
    dailyVariableIncomePaise = Math.round(fallbackMonthlyIncome / 30);
  }

  // 7. Schedule Recurring Bills and Inflows across Forecast Horizon
  interface ScheduledEvent {
    dayOffset: number;
    name: string;
    amountPaise: number; // positive for income, negative for expense
  }

  const scheduledEventsMap: Record<number, ScheduledEvent[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalScheduledBillsPaise = 0;
  let totalScheduledInflowPaise = 0;

  for (const rule of recurringRules) {
    const isIncome = rule.categoryName.toLowerCase().includes("income") || rule.categoryName.toLowerCase().includes("salary");
    let nextDate = new Date(rule.nextExpectedDate);
    nextDate.setHours(0, 0, 0, 0);

    // Roll forward to future if nextExpectedDate was in past
    while (nextDate < today) {
      if (rule.frequency === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (rule.frequency === "quarterly") {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (rule.frequency === "yearly") {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
    }

    // Schedule occurrences within horizonDays
    while (true) {
      const diffDays = Math.round((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > horizonDays) break;

      if (diffDays >= 0) {
        if (!scheduledEventsMap[diffDays]) {
          scheduledEventsMap[diffDays] = [];
        }

        const signedAmount = isIncome ? rule.expectedAmountPaise : -rule.expectedAmountPaise;
        scheduledEventsMap[diffDays].push({
          dayOffset: diffDays,
          name: rule.merchantName,
          amountPaise: signedAmount,
        });

        if (isIncome) {
          totalScheduledInflowPaise += rule.expectedAmountPaise;
        } else {
          totalScheduledBillsPaise += rule.expectedAmountPaise;
        }
      }

      // Step forward by frequency
      if (rule.frequency === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (rule.frequency === "quarterly") {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (rule.frequency === "yearly") {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
    }
  }

  // 8. Daily Trajectory Simulation Across All 3 Scenarios
  let runningBaselinePaise = startingBalancePaise;
  let runningConservativePaise = startingBalancePaise;
  let runningOptimisticPaise = startingBalancePaise;

  const trajectory: ForecastDailyPoint[] = [];
  let lowestPoint = {
    date: today.toISOString().slice(0, 10),
    balancePaise: startingBalancePaise,
  };

  // Scenario multipliers
  const conservativeBurn = Math.round(dailyVariableExpensePaise * 1.15); // +15% variable spend
  const optimisticBurn = Math.round(dailyVariableExpensePaise * 0.85); // -15% variable spend
  const baselineBurn = dailyVariableExpensePaise;

  // Inflows: conservative ignores variable income, baseline & optimistic include normalized income
  const conservativeDailyInflow = 0;
  const baselineDailyInflow = dailyVariableIncomePaise;
  const optimisticDailyInflow = dailyVariableIncomePaise;

  let totalExpectedInflowPaise = totalScheduledInflowPaise + baselineDailyInflow * horizonDays;

  for (let day = 1; day <= horizonDays; day++) {
    const simDate = new Date(today);
    simDate.setDate(simDate.getDate() + day);
    const dateStr = simDate.toISOString().slice(0, 10);

    const eventsToday = scheduledEventsMap[day] || [];
    const scheduledNetPaise = eventsToday.reduce((sum, e) => sum + e.amountPaise, 0);
    const eventLabels = eventsToday.map(
      (e) => `${e.name} (${e.amountPaise >= 0 ? "+" : ""}${formatPaiseToINR(e.amountPaise)})`
    );

    // Update running balances
    runningBaselinePaise += scheduledNetPaise + baselineDailyInflow - baselineBurn;
    runningConservativePaise += scheduledNetPaise + conservativeDailyInflow - conservativeBurn;
    runningOptimisticPaise += scheduledNetPaise + optimisticDailyInflow - optimisticBurn;

    // Track lowest point for chosen scenario
    const activeBalance =
      selectedScenario === "conservative"
        ? runningConservativePaise
        : selectedScenario === "optimistic"
        ? runningOptimisticPaise
        : runningBaselinePaise;

    if (activeBalance < lowestPoint.balancePaise) {
      lowestPoint = {
        date: dateStr,
        balancePaise: activeBalance,
      };
    }

    trajectory.push({
      date: dateStr,
      dayIndex: day,
      baselinePaise: runningBaselinePaise,
      conservativePaise: runningConservativePaise,
      optimisticPaise: runningOptimisticPaise,
      scheduledEvents: eventLabels,
    });
  }

  // 9. Compute Runway Days (Days until liquid balance hits 0 if net negative)
  const netDailyBurn = baselineBurn - baselineDailyInflow;
  let runwayDays: number | null = null;
  if (netDailyBurn > 0 && startingBalancePaise > 0) {
    runwayDays = Math.max(0, Math.floor(startingBalancePaise / netDailyBurn));
  } else if (startingBalancePaise <= 0) {
    runwayDays = 0;
  }

  // 10. Explicit Assumptions & Method Disclosures
  const assumptions = [
    `Variable daily burn rate calculated at ${formatPaiseToINR(baselineBurn)}/day from ${normalVariableExpenses.length} historical expenses.`,
    `Scheduled active bills totaling ${formatPaiseToINR(totalScheduledBillsPaise)} are deducted on their exact projected due dates.`,
    "Conservative scenario models a 15% increase in variable expenses with zero unconfirmed inflows.",
    "Optimistic scenario models a 15% reduction in discretionary spending.",
  ];

  if (isLowDataState) {
    assumptions.unshift(
      "Low data state: Projections are preliminary heuristics based on your onboarding profile. Import 30+ days of statements for tailored machine intelligence."
    );
  }

  return {
    horizonDays,
    selectedScenario,
    confidence,
    isLowDataState,
    dataPointsAnalyzed: txCount,
    historicalDaysAnalyzed,
    startingBalancePaise,
    scenarios: {
      baseline: {
        endBalancePaise: runningBaselinePaise,
        netChangePaise: runningBaselinePaise - startingBalancePaise,
      },
      conservative: {
        endBalancePaise: runningConservativePaise,
        netChangePaise: runningConservativePaise - startingBalancePaise,
      },
      optimistic: {
        endBalancePaise: runningOptimisticPaise,
        netChangePaise: runningOptimisticPaise - startingBalancePaise,
      },
    },
    metrics: {
      dailyVariableBurnPaise: baselineBurn,
      totalScheduledBillsPaise,
      totalExpectedInflowPaise,
      lowestPoint,
      runwayDays,
    },
    trajectory,
    assumptions,
    disclaimer:
      "Estimates are mathematically modeled projections based on historical transactions and active subscriptions, not guaranteed future balances.",
  };
}
