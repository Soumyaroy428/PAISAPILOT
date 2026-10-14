import { z } from "zod";
import { ObjectId } from "mongodb";
import type { Document } from "mongodb";

export type CategoryKind = "expense" | "income" | "both";

export interface CategoryDocument extends Document {
  _id?: ObjectId;
  userId: string;
  name: string;
  nameNormalized: string;
  kind: CategoryKind;
  color?: string;
  icon?: string;
  isSystem: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(50, "Category name must be under 50 characters"),
  kind: z.enum(["expense", "income", "both"]).default("expense"),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color code")
    .optional(),
  icon: z.string().trim().max(30).optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  kind: z.enum(["expense", "income", "both"]).optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color code")
    .optional(),
  icon: z.string().trim().max(30).optional(),
  isArchived: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

