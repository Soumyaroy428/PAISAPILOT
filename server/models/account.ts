import { z } from "zod";
import { ObjectId } from "mongodb";
import type { Document } from "mongodb";

export type AccountType =
  | "bank_account"
  | "upi"
  | "credit_card"
  | "debit_card"
  | "cash"
  | "wallet"
  | "other";

export interface AccountDocument extends Document {
  _id?: ObjectId;
  userId: string;
  name: string;
  type: AccountType;
  institution?: string;
  accountNumberMasked?: string;
  currency: string;
  currentBalancePaise: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name is required")
    .max(50, "Account name must be under 50 characters"),
  type: z.enum([
    "bank_account",
    "upi",
    "credit_card",
    "debit_card",
    "cash",
    "wallet",
    "other",
  ]),
  institution: z
    .string()
    .trim()
    .max(50, "Institution name must be under 50 characters")
    .optional(),
  accountNumberMasked: z
    .string()
    .trim()
    .max(20, "Masked number must be under 20 characters")
    .optional(),
  initialBalancePaise: z
    .number()
    .int("Balance must be an integer paise value")
    .default(0),
});

export const UpdateAccountSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  type: z
    .enum([
      "bank_account",
      "upi",
      "credit_card",
      "debit_card",
      "cash",
      "wallet",
      "other",
    ])
    .optional(),
  institution: z.string().trim().max(50).optional(),
  accountNumberMasked: z.string().trim().max(20).optional(),
  isArchived: z.boolean().optional(),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
