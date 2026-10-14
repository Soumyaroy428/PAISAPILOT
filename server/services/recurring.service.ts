import { ObjectId } from "mongodb";
import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import {
  RecurringDocument,
  CreateRecurringInput,
  UpdateRecurringInput,
} from "@/server/models/recurring";
import { TransactionDocument } from "@/server/models/transaction";

/**
 * Common recurring Indian merchant keywords for candidate detection.
 */
const KNOWN_RECURRING_PATTERNS = [
  { keyword: "netflix", name: "Netflix Subscription", category: "Entertainment" },
  { keyword: "spotify", name: "Spotify Premium", category: "Entertainment" },
  { keyword: "hotstar", name: "Disney+ Hotstar", category: "Entertainment" },
  { keyword: "prime", name: "Amazon Prime", category: "Entertainment" },
  { keyword: "youtube", name: "YouTube Premium", category: "Entertainment" },
  { keyword: "jio", name: "Jio Fiber / Mobile", category: "Bills & Utilities" },
  { keyword: "airtel", name: "Airtel Broadband / Mobile", category: "Bills & Utilities" },
  { keyword: "bescom", name: "Bescom Electricity", category: "Bills & Utilities" },
  { keyword: "rent", name: "House Rent", category: "Housing & Rent" },
  { keyword: "maintenance", name: "Society Maintenance", category: "Housing & Rent" },
  { keyword: "cult", name: "Cult.fit Fitness Pass", category: "Healthcare" },
  { keyword: "zerodha", name: "Zerodha SIP Investment", category: "Investments" },
  { keyword: "groww", name: "Groww Mutual Fund SIP", category: "Investments" },
];

/**
 * Returns all recurring payment rules for user.
 */
export async function getRecurringRules(userId: string): Promise<RecurringDocument[]> {
  await ensureDatabaseIndexes();
  const recurringCol = await getCollection<RecurringDocument>("recurring");

  return recurringCol
    .find({ userId, status: { $ne: "dismissed" } })
    .sort({ nextExpectedDate: 1 })
    .toArray();
}

/**
 * Retrieves upcoming recurring bills due within the next N days.
 */
export async function getUpcomingBills(
  userId: string,
  daysAhead = 15
): Promise<{
  bills: RecurringDocument[];
  totalDuePaise: number;
}> {
  await ensureDatabaseIndexes();
  const recurringCol = await getCollection<RecurringDocument>("recurring");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureLimit = new Date(today);
  futureLimit.setDate(futureLimit.getDate() + daysAhead);
  futureLimit.setHours(23, 59, 59, 999);

  const bills = await recurringCol
    .find({
      userId,
      status: "active",
      nextExpectedDate: {
        $gte: today,
        $lte: futureLimit,
      },
    })
    .sort({ nextExpectedDate: 1 })
    .toArray();

  const totalDuePaise = bills.reduce((sum, b) => sum + b.expectedAmountPaise, 0);

  return { bills, totalDuePaise };
}

/**
 * Heuristically detects recurring payment candidates from historical transactions.
 * Staged as "candidate" so users can confirm or dismiss.
 */
export async function detectRecurringCandidates(userId: string): Promise<{
  newCandidatesCount: number;
  candidates: RecurringDocument[];
}> {
  await ensureDatabaseIndexes();
  const transactionsCol = await getCollection<TransactionDocument>("transactions");
  const recurringCol = await getCollection<RecurringDocument>("recurring");

  // Fetch expense transactions from last 120 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 120);

  const expenses = await transactionsCol
    .find({
      userId,
      type: "expense",
      transactionDate: { $gte: cutoff },
    })
    .sort({ transactionDate: -1 })
    .toArray();

  // Existing registered merchants
  const existingRules = await recurringCol.find({ userId }).toArray();
  const existingMerchants = new Set(
    existingRules.map((r) => r.merchantName.toLowerCase())
  );

  const newCandidates: Omit<RecurringDocument, "_id">[] = [];
  const now = new Date();

  // 1. Check known recurring merchant patterns
  for (const pattern of KNOWN_RECURRING_PATTERNS) {
    if (existingMerchants.has(pattern.name.toLowerCase())) continue;

    const matchedTxns = expenses.filter((t) =>
      t.description.toLowerCase().includes(pattern.keyword)
    );

    if (matchedTxns.length > 0) {
      const latestTx = matchedTxns[0];
      const nextDate = new Date(latestTx.transactionDate);
      nextDate.setMonth(nextDate.getMonth() + 1);

      // If next date is already in the past, roll forward to upcoming month
      while (nextDate < now) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      newCandidates.push({
        userId,
        merchantName: pattern.name,
        expectedAmountPaise: latestTx.amountPaise,
        frequency: "monthly",
        categoryName: pattern.category,
        lastChargedDate: latestTx.transactionDate,
        nextExpectedDate: nextDate,
        status: "candidate",
        autoDetected: true,
        confidence: 0.9,
        notes: `Detected from transaction: "${latestTx.description}"`,
        createdAt: now,
        updatedAt: now,
      });

      existingMerchants.add(pattern.name.toLowerCase());
    }
  }

  // Insert staged candidates
  if (newCandidates.length > 0) {
    await recurringCol.insertMany(newCandidates as any);
  }

  const allCandidates = await recurringCol
    .find({ userId, status: "candidate" })
    .sort({ confidence: -1 })
    .toArray();

  return {
    newCandidatesCount: newCandidates.length,
    candidates: allCandidates,
  };
}

/**
 * Creates a manual recurring rule.
 */
export async function createRecurringRule(
  userId: string,
  input: CreateRecurringInput
): Promise<RecurringDocument> {
  await ensureDatabaseIndexes();
  const recurringCol = await getCollection<RecurringDocument>("recurring");

  const now = new Date();
  const doc: Omit<RecurringDocument, "_id"> = {
    userId,
    merchantName: input.merchantName.trim(),
    expectedAmountPaise: Math.round(input.amountInr * 100),
    frequency: input.frequency || "monthly",
    categoryName: input.categoryName || "Bills & Utilities",
    lastChargedDate: new Date(),
    nextExpectedDate: new Date(input.nextExpectedDate),
    status: "active",
    autoDetected: false,
    confidence: 1.0,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  const res = await recurringCol.insertOne(doc as any);
  return {
    _id: res.insertedId,
    ...doc,
  } as unknown as RecurringDocument;
}

/**
 * Updates recurring rule status (e.g., active, paused, dismissed).
 */
export async function updateRecurringRule(
  userId: string,
  ruleId: string,
  input: UpdateRecurringInput
): Promise<RecurringDocument | null> {
  if (!ObjectId.isValid(ruleId)) return null;

  const recurringCol = await getCollection<RecurringDocument>("recurring");
  const updateFields: any = { updatedAt: new Date() };

  if (input.status) updateFields.status = input.status;
  if (input.amountInr) updateFields.expectedAmountPaise = Math.round(input.amountInr * 100);
  if (input.frequency) updateFields.frequency = input.frequency;
  if (input.nextExpectedDate) updateFields.nextExpectedDate = new Date(input.nextExpectedDate);
  if (input.notes !== undefined) updateFields.notes = input.notes;

  return recurringCol.findOneAndUpdate(
    { _id: new ObjectId(ruleId), userId },
    { $set: updateFields },
    { returnDocument: "after" }
  );
}
