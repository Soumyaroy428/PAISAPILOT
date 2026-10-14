import { z } from "zod";
import { ObjectId } from "mongodb";
import type { Document } from "mongodb";

export type PersonaType =
  | "student"
  | "young_professional"
  | "freelancer"
  | "family"
  | "small_business";

export interface OnboardingProfile {
  persona: PersonaType;
  incomeBand?: string;
  primaryInflowSource?: string;
  fixedCommitments?: string[];
  primaryPaymentMethods?: string[];
  monthlyBudgetPaise?: number;
  savingsTargetPercent?: number;
  completedAt: Date;
}

export interface UserDocument extends Document {
  _id?: ObjectId;
  emailNormalized: string;
  displayName: string;
  passwordHash: string;
  status: "active" | "pending_verification" | "disabled" | "deletion_pending";
  persona?: PersonaType | null;
  onboardingCompleted: boolean;
  onboardingProfile?: OnboardingProfile | null;
  preferences: {
    timezone: string;
    currency: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const RegisterInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be under 60 characters"),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be under 100 characters"),
});

export const LoginInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const OnboardingQuizInputSchema = z.object({
  persona: z.enum([
    "student",
    "young_professional",
    "freelancer",
    "family",
    "small_business",
  ]),
  incomeBand: z.string().optional(),
  primaryInflowSource: z.string().optional(),
  fixedCommitments: z.array(z.string()).default([]),
  primaryPaymentMethods: z.array(z.string()).default([]),
  monthlyBudgetPaise: z.number().int().nonnegative().optional(),
  savingsTargetPercent: z.number().min(0).max(100).optional(),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type OnboardingQuizInput = z.infer<typeof OnboardingQuizInputSchema>;
