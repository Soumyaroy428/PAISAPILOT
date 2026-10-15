import { z } from "zod";
import { ObjectId } from "mongodb";
import type { Document } from "mongodb";

export type BankConsentStatus =
  | "not_started"
  | "pending_consent"
  | "active"
  | "rejected"
  | "expired"
  | "revoked"
  | "paused";

export type BankSyncStatus =
  | "idle"
  | "in_progress"
  | "success"
  | "partial"
  | "failed";

export interface LinkedBankAccount {
  providerAccountId: string;
  maskedAccountNumber: string;
  institutionName: string;
  fipId: string;
  accountType?: string;
  localAccountId?: string;
}

export interface BankConnectionDocument extends Document {
  _id?: ObjectId;
  userId: string;
  provider: string; // e.g. "setu_aa", "finvu_aa", "sahamati_rebit"
  providerConsentId: string;
  consentStatus: BankConsentStatus;
  consentScope: string[];
  consentDuration: {
    from: Date;
    to: Date;
  };
  consentExpiry: Date;
  linkedAccounts: LinkedBankAccount[];
  lastSuccessfulSyncAt?: Date;
  lastSyncStatus?: BankSyncStatus;
  lastErrorCode?: string; // Safe, redacted error code (never credentials/tokens)
  syncCursor?: string;
  correlationId?: string;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateConsentRequestSchema = z.object({
  institutionFipId: z.string().trim().min(1, "Financial Institution ID is required"),
  consentDurationDays: z.number().int().min(1).max(365).default(90),
  scope: z
    .array(z.string())
    .min(1, "At least one data scope is required")
    .default(["TRANSACTIONS", "PROFILE", "SUMMARY"]),
});

export const ConsentCallbackQuerySchema = z.object({
  state: z.string().min(16, "Invalid or missing state correlation token"),
  consentId: z.string().min(1, "Missing provider consent identifier"),
  status: z.enum(["success", "rejected", "expired", "revoked", "failed"]).default("success"),
});

export const DisconnectBankSchema = z.object({
  connectionId: z.string().min(1, "Connection ID is required"),
  reason: z.string().max(200).optional(),
});

export type CreateConsentRequestInput = z.infer<typeof CreateConsentRequestSchema>;
export type ConsentCallbackQuery = z.infer<typeof ConsentCallbackQuerySchema>;
export type DisconnectBankInput = z.infer<typeof DisconnectBankSchema>;

