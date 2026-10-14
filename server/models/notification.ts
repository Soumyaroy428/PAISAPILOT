import { ObjectId } from "mongodb";
import type { Document } from "mongodb";

export type NotificationType =
  | "budget_warning"
  | "budget_exceeded"
  | "recurring_due"
  | "unusual_spend";

export type NotificationSeverity = "info" | "warning" | "critical";

export interface NotificationDocument extends Document {
  _id?: ObjectId;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  link?: string;
  isRead: boolean;
  fingerprint: string; // Guaranteed uniqueness per period to prevent duplicate alert spam
  createdAt: Date;
}
