import { ObjectId } from "mongodb";
import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import {
  TransactionDocument,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryParams,
} from "@/server/models/transaction";
import {
  getAccountById,
  adjustAccountBalance,
} from "@/server/services/account.service";
import { matchDeterministicCategory } from "@/server/services/categorization.service";

export interface PaginatedTransactionsResult {
  transactions: TransactionDocument[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  summary: {
    totalIncomePaise: number;
    totalExpensePaise: number;
    netCashflowPaise: number;
  };
}

/**
 * Retrieves paginated transactions for a user with comprehensive filters and aggregate totals.
 */
export async function getTransactions(
  userId: string,
  params: TransactionQueryParams
): Promise<PaginatedTransactionsResult> {
  await ensureDatabaseIndexes();
  const transactionsCol = await getCollection<TransactionDocument>("transactions");

  const query: any = { userId };

  if (params.type) {
    query.type = params.type;
  }

  if (params.categoryId) {
    query.categoryId = params.categoryId;
  }

  if (params.accountId) {
    query.$or = [
      { accountId: params.accountId },
      { toAccountId: params.accountId },
    ];
  }

  if (params.startDate || params.endDate) {
    query.transactionDate = {};
    if (params.startDate) {
      query.transactionDate.$gte = new Date(params.startDate);
    }
    if (params.endDate) {
      // Include the entire end date until 23:59:59.999
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      query.transactionDate.$lte = end;
    }
  }

  if (params.search) {
    const escaped = params.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.description = { $regex: escaped, $options: "i" };
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  // Run data fetch and totals in parallel
  const [transactions, totalCount, aggregateTotals] = await Promise.all([
    transactionsCol
      .find(query)
      .sort({ transactionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    transactionsCol.countDocuments(query),
    transactionsCol
      .aggregate([
        { $match: query },
        {
          $group: {
            _id: "$type",
            totalPaise: { $sum: "$amountPaise" },
          },
        },
      ])
      .toArray(),
  ]);

  let totalIncomePaise = 0;
  let totalExpensePaise = 0;

  for (const item of aggregateTotals) {
    if (item._id === "income") {
      totalIncomePaise = item.totalPaise;
    } else if (item._id === "expense") {
      totalExpensePaise = item.totalPaise;
    }
  }

  const netCashflowPaise = totalIncomePaise - totalExpensePaise;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  return {
    transactions,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
    summary: {
      totalIncomePaise,
      totalExpensePaise,
      netCashflowPaise,
    },
  };
}

/**
 * Creates a new manual transaction and adjusts source/destination account balances atomically.
 */
export async function createTransaction(
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionDocument> {
  await ensureDatabaseIndexes();
  const transactionsCol = await getCollection<TransactionDocument>("transactions");

  // Validate account ownership
  let accountName = input.accountName;
  if (input.accountId) {
    const account = await getAccountById(userId, input.accountId);
    if (!account) {
      throw new Error("Specified payment account not found or access denied.");
    }
    accountName = account.name;
  }

  // Validate destination account for transfers
  let toAccountName = input.toAccountName;
  if (input.type === "transfer" && input.toAccountId) {
    const toAccount = await getAccountById(userId, input.toAccountId);
    if (!toAccount) {
      throw new Error("Destination account not found or access denied.");
    }
    toAccountName = toAccount.name;
  }

  // Auto-resolve category if not provided by user
  let categoryName = input.categoryName;
  if (!categoryName) {
    const autoMatch = matchDeterministicCategory(input.description, input.type);
    if (autoMatch.isMatched && autoMatch.categoryName !== "Uncategorized") {
      categoryName = autoMatch.categoryName;
    }
  }

  const transactionDoc: Omit<TransactionDocument, "_id"> = {
    userId,
    type: input.type,
    amountPaise: input.amountPaise,
    currency: "INR",
    transactionDate: input.transactionDate,
    description: input.description,
    merchantNormalized: input.merchantNormalized,
    categoryId: input.categoryId,
    categoryName,
    accountId: input.accountId,
    accountName,
    toAccountId: input.toAccountId,
    toAccountName,
    paymentMode: input.paymentMode,
    source: "manual",
    notes: input.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const insertResult = await transactionsCol.insertOne(transactionDoc as any);
  const createdTransaction = {
    _id: insertResult.insertedId,
    ...transactionDoc,
  } as unknown as TransactionDocument;

  // Adjust account balances atomically in integer paise
  if (input.accountId) {
    if (input.type === "income") {
      await adjustAccountBalance(userId, input.accountId, input.amountPaise);
    } else if (input.type === "expense") {
      await adjustAccountBalance(userId, input.accountId, -input.amountPaise);
    } else if (input.type === "transfer" && input.toAccountId) {
      await adjustAccountBalance(userId, input.accountId, -input.amountPaise);
      await adjustAccountBalance(userId, input.toAccountId, input.amountPaise);
    }
  }

  return createdTransaction;
}

/**
 * Retrieves a single transaction strictly owned by the user.
 */
export async function getTransactionById(
  userId: string,
  transactionId: string
): Promise<TransactionDocument | null> {
  if (!ObjectId.isValid(transactionId)) return null;

  const transactionsCol = await getCollection<TransactionDocument>("transactions");
  return transactionsCol.findOne({
    _id: new ObjectId(transactionId),
    userId,
  });
}

/**
 * Deletes a transaction and reverts any account balance adjustments made.
 */
export async function deleteTransaction(
  userId: string,
  transactionId: string
): Promise<boolean> {
  if (!ObjectId.isValid(transactionId)) return false;

  const transactionsCol = await getCollection<TransactionDocument>("transactions");
  const existing = await transactionsCol.findOne({
    _id: new ObjectId(transactionId),
    userId,
  });

  if (!existing) return false;

  // Revert balance adjustments
  if (existing.accountId) {
    if (existing.type === "income") {
      await adjustAccountBalance(userId, existing.accountId, -existing.amountPaise);
    } else if (existing.type === "expense") {
      await adjustAccountBalance(userId, existing.accountId, existing.amountPaise);
    } else if (existing.type === "transfer" && existing.toAccountId) {
      await adjustAccountBalance(userId, existing.accountId, existing.amountPaise);
      await adjustAccountBalance(userId, existing.toAccountId, -existing.amountPaise);
    }
  }

  const deleteResult = await transactionsCol.deleteOne({
    _id: new ObjectId(transactionId),
    userId,
  });

  return deleteResult.deletedCount > 0;
}
