import { z } from "zod";
import { ObjectId } from "mongodb";
import type { Document } from "mongodb";

export type ImportSourceType = "csv" | "sbi_pdf";
export type ImportStatus =
  | "uploaded"
  | "parsed"
  | "preview_ready"
  | "committing"
  | "completed"
  | "failed"
  | "cancelled";

export type RowStatus = "valid" | "duplicate" | "invalid";

export interface CandidateImportRow {
  rowIndex: number;
  transactionDate: string; // ISO YYYY-MM-DD
  description: string;
  type: "income" | "expense";
  amountPaise: number;
  referenceNo?: string;
  categoryName?: string;
  fingerprint: string;
  status: RowStatus;
  validationError?: string;
  selectedForCommit: boolean;
}

export interface ImportDocument extends Document {
  _id?: ObjectId;
  userId: string;
  accountId?: string;
  accountName?: string;
  sourceType: ImportSourceType;
  originalFileName: string;
  fileSizeBytes: number;
  contentHash: string;
  status: ImportStatus;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  insertedCount: number;
  parsedRows: CandidateImportRow[];
  errorSummary?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export const CommitImportSchema = z.object({
  accountId: z.string().min(1, "Target account is required"),
  selectedRowIndices: z.array(z.number().int().nonnegative()),
});

export type CommitImportInput = z.infer<typeof CommitImportSchema>;

