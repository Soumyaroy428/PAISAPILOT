import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import { TransactionDocument } from "@/server/models/transaction";

/**
 * Sanitizes a string to prevent CSV formula injection attacks in Excel or Google Sheets.
 * If the string starts with =, +, -, @, or tab/return, prefixes it with a single quote.
 */
export function sanitizeForCsv(val: string | undefined | null): string {
  if (!val) return "";
  const str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  // Escape embedded quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports user's transaction records to sanitized CSV format.
 */
export async function exportTransactionsToCsv(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<string> {
  await ensureDatabaseIndexes();
  const transactionsCol = await getCollection<TransactionDocument>("transactions");

  const query: any = { userId };
  if (startDate || endDate) {
    query.transactionDate = {};
    if (startDate) query.transactionDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.transactionDate.$lte = end;
    }
  }

  const transactions = await transactionsCol
    .find(query)
    .sort({ transactionDate: -1, createdAt: -1 })
    .toArray();

  const headers = [
    "Transaction Date",
    "Description",
    "Type",
    "Amount (INR)",
    "Amount (Paise)",
    "Category",
    "Account",
    "Payment Mode",
    "Source",
    "Reference",
    "Notes",
  ];

  const rows = transactions.map((t) => {
    const dateStr = new Date(t.transactionDate).toISOString().split("T")[0];
    const amountInr = (t.amountPaise / 100).toFixed(2);

    return [
      sanitizeForCsv(dateStr),
      sanitizeForCsv(t.description),
      sanitizeForCsv(t.type),
      sanitizeForCsv(amountInr),
      t.amountPaise.toString(),
      sanitizeForCsv(t.categoryName || "Uncategorized"),
      sanitizeForCsv(t.accountName || ""),
      sanitizeForCsv(t.paymentMode || ""),
      sanitizeForCsv(t.source),
      sanitizeForCsv(t.externalReferenceHash ? "Verified" : ""),
      sanitizeForCsv(t.notes || ""),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Exports user's transaction records to clean JSON structure.
 */
export async function exportTransactionsToJson(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  await ensureDatabaseIndexes();
  const transactionsCol = await getCollection<TransactionDocument>("transactions");

  const query: any = { userId };
  if (startDate || endDate) {
    query.transactionDate = {};
    if (startDate) query.transactionDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.transactionDate.$lte = end;
    }
  }

  const transactions = await transactionsCol
    .find(query)
    .sort({ transactionDate: -1, createdAt: -1 })
    .toArray();

  return transactions.map((t) => ({
    id: t._id?.toString(),
    transactionDate: new Date(t.transactionDate).toISOString().split("T")[0],
    description: t.description,
    type: t.type,
    amountInr: t.amountPaise / 100,
    amountPaise: t.amountPaise,
    category: t.categoryName || "Uncategorized",
    account: t.accountName || null,
    paymentMode: t.paymentMode || null,
    source: t.source,
    notes: t.notes || null,
    createdAt: t.createdAt,
  }));
}

