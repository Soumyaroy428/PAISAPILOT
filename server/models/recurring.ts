import { z } from "zod";
import { ObjectId } from "mongodb";
import type { Document } from "mongodb";

export type RecurringFrequency = "monthly" | "quarterly" | "yearly" | "weekly";
export type RecurringStatus = "candidate" | "active" | "paused" | "dismissed";

export interface RecurringDocument extends Document {
  _id?: ObjectId;
  userId: string;
  merchantName: string;
  expectedAmountPaise: number;
  frequency: RecurringFrequency;
  categoryName: string;
  lastChargedDate: Date;
  nextExpectedDate: Date;
  status: RecurringStatus;
  autoDetected: boolean;
  confidence: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateRecurringSchema = z.object({
  merchantName: z.string().trim().min(1, "Merchant name is required").max(60),
  amountInr: z.number().positive("Amount must be greater than zero"),
  frequency: z.enum(["monthly", "quarterly", "yearly", "weekly"]).default("monthly"),
  categoryName: z.string().trim().min(1).default("Bills & Utilities"),
  nextExpectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  notes: z.string().max(200).optional(),
});

export const UpdateRecurringSchema = z.object({
  status: z.enum(["candidate", "active", "paused", "dismissed"]).optional(),
  amountInr: z.number().positive().optional(),
  frequency: z.enum(["monthly", "quarterly", "yearly", "weekly"]).optional(),
  nextExpectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(200).optional(),
});

export type CreateRecurringInput = z.infer<typeof CreateRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof UpdateRecurringSchema>;
