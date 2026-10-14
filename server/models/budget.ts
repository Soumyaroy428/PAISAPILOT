import { z } from "zod";
import { ObjectId } from "mongodb";
import type { Document } from "mongodb";

export type BudgetPeriod = "monthly";

export interface BudgetDocument extends Document {
  _id?: ObjectId;
  userId: string;
  categoryName: string; // "Overall" or specific category e.g. "Food & Dining"
  amountPaise: number; // integer paise
  period: BudgetPeriod;
  alertThresholdPercent: number; // default 85%
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetProgress {
  budget: BudgetDocument;
  spentPaise: number;
  remainingPaise: number;
  utilizationPercent: number;
  status: "normal" | "warning" | "exceeded";
}

export const CreateBudgetSchema = z.object({
  categoryName: z.string().trim().min(1, "Category name is required").max(50),
  amountInr: z.number().positive("Budget amount must be greater than zero"),
  alertThresholdPercent: z.number().min(50).max(100).default(85),
});

export const UpdateBudgetSchema = z.object({
  amountInr: z.number().positive().optional(),
  alertThresholdPercent: z.number().min(50).max(100).optional(),
  isArchived: z.boolean().optional(),
});

export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;

