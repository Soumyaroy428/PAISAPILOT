import { createHash } from "crypto";
import { ObjectId } from "mongodb";
import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import {
  ImportDocument,
  CandidateImportRow,
  ImportSourceType,
} from "@/server/models/import";
import { TransactionDocument } from "@/server/models/transaction";
import {
  getAccountById,
  adjustAccountBalance,
} from "@/server/services/account.service";
import { parseStatementCsv } from "@/server/lib/parsers/csv.parser";
import { parseSbiPdfStatement } from "@/server/lib/parsers/sbi-pdf.parser";
import { matchDeterministicCategory } from "@/server/services/categorization.service";

/**
 * Computes SHA-256 hash for file content deduplication.
 */
export function computeContentHash(buffer: Buffer | Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Computes deterministic fingerprint for an imported transaction row.
 * Normalizes description by removing variable timestamps and whitespace.
 */
export function computeRowFingerprint(
  userId: string,
  date: string,
  amountPaise: number,
  description: string,
  referenceNo?: string
): string {
  const normalizedDesc = description
    .toLowerCase()
    .replace(/\b\d{2}:\d{2}(?::\d{2})?\b/g, "") // strip time
    .replace(/[^a-z0-9]/g, ""); // keep alphanumeric

  const rawKey = `${userId}|${date}|${amountPaise}|${normalizedDesc}|${referenceNo || ""}`;
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Parses statement buffer, runs duplicate detection against existing transactions,
 * and stages the candidate preview rows in the database.
 */
export async function createImportPreview(
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  sourceType: ImportSourceType,
  accountId?: string
): Promise<ImportDocument> {
  await ensureDatabaseIndexes();
  const importsCol = await getCollection<ImportDocument>("imports");
  const transactionsCol = await getCollection<TransactionDocument>("transactions");

  const contentHash = computeContentHash(fileBuffer);
  let parsedRawRows: any[] = [];
  let errorSummary: string | undefined;

  if (sourceType === "csv") {
    const csvContent = fileBuffer.toString("utf-8");
    parsedRawRows = parseStatementCsv(csvContent);
  } else if (sourceType === "sbi_pdf") {
    const { rows, warnings } = await parseSbiPdfStatement(fileBuffer);
    parsedRawRows = rows;
    if (warnings.length > 0) {
      errorSummary = warnings.join("; ");
    }
  }

  // Fetch account name if specified
  let accountName: string | undefined;
  if (accountId) {
    const acc = await getAccountById(userId, accountId);
    if (acc) accountName = acc.name;
  }

  // Run duplicate detection against existing ledger
  const candidateRows: CandidateImportRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const raw of parsedRawRows) {
    const fingerprint = computeRowFingerprint(
      userId,
      raw.transactionDate,
      raw.amountPaise,
      raw.description,
      raw.referenceNo
    );

    let status: "valid" | "duplicate" | "invalid" = "valid";
    let validationError = raw.error;

    if (!raw.isValid) {
      status = "invalid";
      invalidCount++;
    } else {
      // Check if duplicate exists in transactions collection
      const existing = await transactionsCol.findOne({
        userId,
        $or: [
          { externalReferenceHash: fingerprint },
          {
            transactionDate: new Date(raw.transactionDate),
            amountPaise: raw.amountPaise,
            description: raw.description,
          },
        ],
      });

      if (existing) {
        status = "duplicate";
        duplicateCount++;
      } else {
        validCount++;
      }
    }

    const autoCategory = matchDeterministicCategory(raw.description, raw.type);
    const categoryName =
      autoCategory.isMatched && autoCategory.categoryName !== "Uncategorized"
        ? autoCategory.categoryName
        : undefined;

    candidateRows.push({
      rowIndex: raw.rowIndex,
      transactionDate: raw.transactionDate,
      description: raw.description,
      type: raw.type,
      amountPaise: raw.amountPaise,
      referenceNo: raw.referenceNo,
      categoryName,
      fingerprint,
      status,
      validationError,
      selectedForCommit: status === "valid", // default select non-duplicates
    });
  }

  const importDoc: Omit<ImportDocument, "_id"> = {
    userId,
    accountId,
    accountName,
    sourceType,
    originalFileName: fileName.slice(0, 100),
    fileSizeBytes: fileBuffer.length,
    contentHash,
    status: "preview_ready",
    rowCount: candidateRows.length,
    validCount,
    invalidCount,
    duplicateCount,
    insertedCount: 0,
    parsedRows: candidateRows,
    errorSummary,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await importsCol.insertOne(importDoc as any);
  return {
    _id: res.insertedId,
    ...importDoc,
  } as unknown as ImportDocument;
}

/**
 * Retrieves an import session strictly belonging to the authenticated user.
 */
export async function getImportById(
  userId: string,
  importId: string
): Promise<ImportDocument | null> {
  if (!ObjectId.isValid(importId)) return null;

  const importsCol = await getCollection<ImportDocument>("imports");
  return importsCol.findOne({
    _id: new ObjectId(importId),
    userId,
  });
}

/**
 * Idempotently commits user-selected candidate rows to the transactions ledger.
 * Automatically reconciles the target account balance.
 */
export async function commitImport(
  userId: string,
  importId: string,
  selectedRowIndices: number[],
  targetAccountId: string
): Promise<{
  insertedCount: number;
  duplicateCount: number;
  totalIncomePaise: number;
  totalExpensePaise: number;
}> {
  if (!ObjectId.isValid(importId)) {
    throw new Error("Invalid import session identifier.");
  }

  const importsCol = await getCollection<ImportDocument>("imports");
  const transactionsCol = await getCollection<TransactionDocument>("transactions");

  const importRecord = await importsCol.findOne({
    _id: new ObjectId(importId),
    userId,
  });

  if (!importRecord) {
    throw new Error("Import session not found or unauthorized.");
  }

  if (importRecord.status === "completed") {
    throw new Error("This statement import has already been committed.");
  }

  // Validate target account ownership
  const targetAccount = await getAccountById(userId, targetAccountId);
  if (!targetAccount) {
    throw new Error("Target account not found or unauthorized.");
  }

  // Filter selected rows
  const selectedSet = new Set(selectedRowIndices);
  const rowsToCommit = importRecord.parsedRows.filter(
    (r) => selectedSet.has(r.rowIndex) && r.status !== "invalid"
  );

  if (rowsToCommit.length === 0) {
    throw new Error("No valid transactions were selected for commit.");
  }

  // Double-check against newly added fingerprints to guarantee idempotency
  const newTransactions: Omit<TransactionDocument, "_id">[] = [];
  let skippedDuplicates = 0;
  let totalIncomePaise = 0;
  let totalExpensePaise = 0;

  for (const row of rowsToCommit) {
    const existing = await transactionsCol.findOne({
      userId,
      externalReferenceHash: row.fingerprint,
    });

    if (existing) {
      skippedDuplicates++;
      continue;
    }

    if (row.type === "income") {
      totalIncomePaise += row.amountPaise;
    } else {
      totalExpensePaise += row.amountPaise;
    }

    newTransactions.push({
      userId,
      type: row.type,
      amountPaise: row.amountPaise,
      currency: "INR",
      transactionDate: new Date(row.transactionDate),
      description: row.description,
      categoryName: row.categoryName,
      accountId: targetAccountId,
      accountName: targetAccount.name,
      source: importRecord.sourceType === "csv" ? "csv_import" : "pdf_import",
      importId,
      externalReferenceHash: row.fingerprint,
      notes: row.referenceNo ? `Ref No: ${row.referenceNo}` : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  if (newTransactions.length > 0) {
    await transactionsCol.insertMany(newTransactions as any);

    // Atomically adjust account balance with net delta
    const deltaPaise = totalIncomePaise - totalExpensePaise;
    if (deltaPaise !== 0) {
      await adjustAccountBalance(userId, targetAccountId, deltaPaise);
    }
  }

  // Update import record status
  await importsCol.updateOne(
    { _id: new ObjectId(importId), userId },
    {
      $set: {
        status: "completed",
        accountId: targetAccountId,
        accountName: targetAccount.name,
        insertedCount: newTransactions.length,
        duplicateCount: importRecord.duplicateCount + skippedDuplicates,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return {
    insertedCount: newTransactions.length,
    duplicateCount: skippedDuplicates,
    totalIncomePaise,
    totalExpensePaise,
  };
}

