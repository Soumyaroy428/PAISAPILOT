import { z } from "zod";
import { ObjectId } from "mongodb";
import type { Document } from "mongodb";

export type TransactionType = "income" | "expense" | "transfer";
export type TransactionSource =
  | "manual"
  | "csv_import"
  | "pdf_import"
  | "authorized_provider";
export type PaymentMode = "upi" | "netbanking" | "card" | "cash" | "other";

export interface TransactionDocument extends Document {
  _id?: ObjectId;
  userId: string;
  type: TransactionType;
  amountPaise: number;
  currency: string;
  transactionDate: Date;
  description: string;
  merchantNormalized?: string;
  categoryId?: string;
  categoryName?: string;
  accountId?: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  paymentMode?: PaymentMode;
  source: TransactionSource;
  importId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateTransactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amountPaise: z
    .number()
    .int("Amount must be in integer paise")
    .positive("Amount must be greater than zero"),
  transactionDate: z
    .string()
    .min(1, "Transaction date is required")
    .transform((val) => new Date(val)),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(200, "Description must be under 200 characters"),
  merchantNormalized: z.string().trim().max(100).optional(),
  categoryId: z.string().trim().optional(),
  categoryName: z.string().trim().optional(),
  accountId: z.string().trim().optional(),
  accountName: z.string().trim().optional(),
  toAccountId: z.string().trim().optional(),
  toAccountName: z.string().trim().optional(),
  paymentMode: z
    .enum(["upi", "netbanking", "card", "cash", "other"])
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export const UpdateTransactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]).optional(),
  amountPaise: z
    .number()
    .int("Amount must be in integer paise")
    .positive("Amount must be greater than zero")
    .optional(),
  transactionDate: z
    .string()
    .transform((val) => new Date(val))
    .optional(),
  description: z.string().trim().min(1).max(200).optional(),
  merchantNormalized: z.string().trim().max(100).optional(),
  categoryId: z.string().trim().optional(),
  categoryName: z.string().trim().optional(),
  accountId: z.string().trim().optional(),
  accountName: z.string().trim().optional(),
  toAccountId: z.string().trim().optional(),
  toAccountName: z.string().trim().optional(),
  paymentMode: z
    .enum(["upi", "netbanking", "card", "cash", "other"])
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export const TransactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type TransactionQueryParams = z.infer<typeof TransactionQuerySchema>;
