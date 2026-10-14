import { ObjectId } from "mongodb";
import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import { NotificationDocument } from "@/server/models/notification";
import { getBudgetsWithProgress } from "@/server/services/budget.service";
import { getUpcomingBills } from "@/server/services/recurring.service";
import { formatPaiseToINR } from "@/client/lib/utils";

/**
 * Evaluates current user budgets and upcoming bills, idempotently generating alerts.
 * Guaranteed zero duplicate notification spam via period-based fingerprinting.
 */
export async function evaluateAndGenerateAlerts(userId: string): Promise<{
  newAlertsCount: number;
  totalUnread: number;
}> {
  await ensureDatabaseIndexes();
  const notifCol = await getCollection<NotificationDocument>("notifications");

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;

  const budgetList = await getBudgetsWithProgress(userId);
  const newNotifications: Omit<NotificationDocument, "_id">[] = [];

  // 1. Evaluate Budgets
  for (const item of budgetList) {
    const b = item.budget;
    const catName = b.categoryName;

    if (item.status === "exceeded") {
      const fingerprint = `budget_${userId}_${catName}_${currentMonthKey}_exceeded`;
      const existing = await notifCol.findOne({ userId, fingerprint });

      if (!existing) {
        newNotifications.push({
          userId,
          type: "budget_exceeded",
          title: `Budget Exceeded: ${catName}`,
          message: `You've spent ${formatPaiseToINR(item.spentPaise)} against your ${formatPaiseToINR(b.amountPaise)} budget (${item.utilizationPercent.toFixed(1)}% utilized).`,
          severity: "critical",
          link: "/dashboard/budgets",
          isRead: false,
          fingerprint,
          createdAt: now,
        });
      }
    } else if (item.status === "warning") {
      const fingerprint = `budget_${userId}_${catName}_${currentMonthKey}_warning`;
      const existing = await notifCol.findOne({ userId, fingerprint });

      if (!existing) {
        newNotifications.push({
          userId,
          type: "budget_warning",
          title: `Budget Alert: ${catName}`,
          message: `You've reached ${item.utilizationPercent.toFixed(1)}% of your ${formatPaiseToINR(b.amountPaise)} budget. ${formatPaiseToINR(item.remainingPaise)} remaining.`,
          severity: "warning",
          link: "/dashboard/budgets",
          isRead: false,
          fingerprint,
          createdAt: now,
        });
      }
    }
  }

  // 2. Evaluate Upcoming Bills (next 5 days)
  const { bills } = await getUpcomingBills(userId, 5);
  for (const bill of bills) {
    const dateStr = new Date(bill.nextExpectedDate).toISOString().slice(0, 10);
    const fingerprint = `recurring_${userId}_${bill._id?.toString()}_${dateStr}`;
    const existing = await notifCol.findOne({ userId, fingerprint });

    if (!existing) {
      newNotifications.push({
        userId,
        type: "recurring_due",
        title: `Upcoming Bill: ${bill.merchantName}`,
        message: `${bill.merchantName} of ${formatPaiseToINR(bill.expectedAmountPaise)} is scheduled on ${new Date(bill.nextExpectedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`,
        severity: "info",
        link: "/dashboard/budgets",
        isRead: false,
        fingerprint,
        createdAt: now,
      });
    }
  }

  // Insert newly generated alerts safely
  let newAlertsCount = 0;
  for (const notif of newNotifications) {
    try {
      await notifCol.insertOne(notif as any);
      newAlertsCount++;
    } catch (err: any) {
      // Ignore duplicate key race conditions
    }
  }

  const totalUnread = await notifCol.countDocuments({ userId, isRead: false });

  return { newAlertsCount, totalUnread };
}

/**
 * Returns notifications for user.
 */
export async function getNotifications(
  userId: string,
  limit = 20
): Promise<{
  notifications: NotificationDocument[];
  unreadCount: number;
}> {
  await ensureDatabaseIndexes();
  const notifCol = await getCollection<NotificationDocument>("notifications");

  const [notifications, unreadCount] = await Promise.all([
    notifCol.find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray(),
    notifCol.countDocuments({ userId, isRead: false }),
  ]);

  return { notifications, unreadCount };
}

/**
 * Marks a notification as read.
 */
export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<boolean> {
  if (!ObjectId.isValid(notificationId)) return false;

  const notifCol = await getCollection<NotificationDocument>("notifications");
  const res = await notifCol.updateOne(
    { _id: new ObjectId(notificationId), userId },
    { $set: { isRead: true } }
  );

  return res.modifiedCount > 0;
}

/**
 * Marks all notifications for user as read.
 */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const notifCol = await getCollection<NotificationDocument>("notifications");
  const res = await notifCol.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );

  return res.modifiedCount > 0;
}

