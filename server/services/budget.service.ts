import { ObjectId } from "mongodb";
import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import {
  BudgetDocument,
  BudgetProgress,
  CreateBudgetInput,
  UpdateBudgetInput,
} from "@/server/models/budget";
import { TransactionDocument } from "@/server/models/transaction";
import { UserDocument } from "@/server/models/user";
import { resolvePeriodDateRange } from "@/server/services/analytics.service";

/**
 * Returns all active budgets for the user with live spending progress and status.
 * Auto-seeds baseline budgets if none exist.
 */
export async function getBudgetsWithProgress(userId: string): Promise<BudgetProgress[]> {
  await ensureDatabaseIndexes();
  const budgetsCol = await getCollection<BudgetDocument>("budgets");
  const transactionsCol = await getCollection<TransactionDocument>("transactions");

  let budgets: BudgetDocument[] = await budgetsCol
    .find({ userId, isArchived: false })
    .sort({ categoryName: 1 })
    .toArray();

  if (budgets.length === 0) {
    budgets = await seedDefaultBudgets(userId);
  }

  // Get current calendar month date boundaries
  const { startDate, endDate } = resolvePeriodDateRange("this_month");

  // Fetch all expense transactions for the current month
  const monthlyExpenses = await transactionsCol
    .find({
      userId,
      type: "expense",
      transactionDate: {
        $gte: startDate!,
        $lte: endDate!,
      },
    })
    .toArray();

  // Aggregate spending by category
  let totalOverallSpentPaise = 0;
  const categorySpentMap: Record<string, number> = {};

  for (const tx of monthlyExpenses) {
    totalOverallSpentPaise += tx.amountPaise;
    const cat = tx.categoryName || "Uncategorized";
    categorySpentMap[cat] = (categorySpentMap[cat] || 0) + tx.amountPaise;
  }

  return budgets.map((b) => {
    const isOverall = b.categoryName.toLowerCase() === "overall";
    const spentPaise = isOverall
      ? totalOverallSpentPaise
      : categorySpentMap[b.categoryName] || 0;

    const remainingPaise = Math.max(0, b.amountPaise - spentPaise);
    const utilizationPercent =
      b.amountPaise > 0 ? (spentPaise / b.amountPaise) * 100 : 0;

    let status: "normal" | "warning" | "exceeded" = "normal";
    if (utilizationPercent > 100) {
      status = "exceeded";
    } else if (utilizationPercent >= (b.alertThresholdPercent || 85)) {
      status = "warning";
    }

    return {
      budget: b,
      spentPaise,
      remainingPaise,
      utilizationPercent,
      status,
    };
  });
}

/**
 * Seeds default initial budgets based on user persona or standard presets.
 */
export async function seedDefaultBudgets(userId: string): Promise<BudgetDocument[]> {
  const budgetsCol = await getCollection<BudgetDocument>("budgets");
  const usersCol = await getCollection<UserDocument>("users");

  const user = await usersCol.findOne({ _id: new ObjectId(userId) });
  const baseMonthlyPaise =
    user?.onboardingProfile?.monthlyBudgetPaise || 3500000; // default ₹35,000

  const presets: Array<{ categoryName: string; amountPaise: number; alertThresholdPercent: number }> = [
    {
      categoryName: "Overall",
      amountPaise: baseMonthlyPaise,
      alertThresholdPercent: 85,
    },
    {
      categoryName: "Food & Dining",
      amountPaise: Math.round(baseMonthlyPaise * 0.25),
      alertThresholdPercent: 80,
    },
    {
      categoryName: "Groceries",
      amountPaise: Math.round(baseMonthlyPaise * 0.2),
      alertThresholdPercent: 85,
    },
    {
      categoryName: "Transport",
      amountPaise: Math.round(baseMonthlyPaise * 0.15),
      alertThresholdPercent: 85,
    },
  ];

  const now = new Date();
  const docs: Omit<BudgetDocument, "_id">[] = presets.map((p) => ({
    userId,
    categoryName: p.categoryName,
    amountPaise: p.amountPaise,
    period: "monthly",
    alertThresholdPercent: p.alertThresholdPercent,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }));

  await budgetsCol.insertMany(docs as any);
  return budgetsCol.find({ userId, isArchived: false }).sort({ categoryName: 1 }).toArray();
}

/**
 * Creates a new category budget.
 */
export async function createBudget(
  userId: string,
  input: CreateBudgetInput
): Promise<BudgetDocument> {
  await ensureDatabaseIndexes();
  const budgetsCol = await getCollection<BudgetDocument>("budgets");

  const normalizedCategory = input.categoryName.trim();
  const existing = await budgetsCol.findOne({
    userId,
    categoryName: { $regex: new RegExp(`^${normalizedCategory}$`, "i") },
    isArchived: false,
  });

  if (existing) {
    throw new Error(`A budget for "${normalizedCategory}" already exists.`);
  }

  const amountPaise = Math.round(input.amountInr * 100);
  const now = new Date();
  const doc: Omit<BudgetDocument, "_id"> = {
    userId,
    categoryName: normalizedCategory,
    amountPaise,
    period: "monthly",
    alertThresholdPercent: input.alertThresholdPercent || 85,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  const res = await budgetsCol.insertOne(doc as any);
  return {
    _id: res.insertedId,
    ...doc,
  } as unknown as BudgetDocument;
}

/**
 * Updates an existing budget.
 */
export async function updateBudget(
  userId: string,
  budgetId: string,
  input: UpdateBudgetInput
): Promise<BudgetDocument | null> {
  if (!ObjectId.isValid(budgetId)) return null;

  const budgetsCol = await getCollection<BudgetDocument>("budgets");
  const updateFields: any = { updatedAt: new Date() };

  if (input.amountInr !== undefined) {
    updateFields.amountPaise = Math.round(input.amountInr * 100);
  }
  if (input.alertThresholdPercent !== undefined) {
    updateFields.alertThresholdPercent = input.alertThresholdPercent;
  }
  if (input.isArchived !== undefined) {
    updateFields.isArchived = input.isArchived;
  }

  return budgetsCol.findOneAndUpdate(
    { _id: new ObjectId(budgetId), userId },
    { $set: updateFields },
    { returnDocument: "after" }
  );
}

/**
 * Soft deletes / archives a budget.
 */
export async function archiveBudget(
  userId: string,
  budgetId: string
): Promise<boolean> {
  if (!ObjectId.isValid(budgetId)) return false;

  const budgetsCol = await getCollection<BudgetDocument>("budgets");
  const res = await budgetsCol.updateOne(
    { _id: new ObjectId(budgetId), userId },
    { $set: { isArchived: true, updatedAt: new Date() } }
  );

  return res.modifiedCount > 0;
}
