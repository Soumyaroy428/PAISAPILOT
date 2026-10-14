import { ObjectId } from "mongodb";
import { getCollection } from "@/server/db/mongodb";
import { UserDocument } from "@/server/models/user";
import { TransactionDocument } from "@/server/models/transaction";
import { AccountDocument } from "@/server/models/account";
import { CategoryDocument } from "@/server/models/category";
import { BudgetDocument } from "@/server/models/budget";
import { RecurringDocument } from "@/server/models/recurring";
import { NotificationDocument } from "@/server/models/notification";
import { ImportDocument } from "@/server/models/import";
import { verifyPassword, clearSessionCookie } from "@/server/lib/auth";
import { safeLogger } from "@/server/lib/privacy-logger";

export interface AccountDeletionResult {
  success: boolean;
  deletedCounts: {
    transactions: number;
    accounts: number;
    categories: number;
    budgets: number;
    recurring: number;
    notifications: number;
    imports: number;
  };
}

/**
 * Permanently deletes a user account and purges all associated financial data (Right to be Forgotten).
 * Requires password confirmation to prevent unauthorized or accidental data loss.
 */
export async function deleteUserAccountPermanently(
  userId: string,
  confirmedPassword?: string,
  bypassPasswordCheck = false
): Promise<AccountDeletionResult> {
  const usersCol = await getCollection<UserDocument>("users");
  const user = await usersCol.findOne({ _id: new ObjectId(userId) });

  if (!user) {
    throw new Error("User account not found.");
  }

  // 1. Password Verification (unless explicitly bypassed in internal automated test harness)
  if (!bypassPasswordCheck) {
    if (!confirmedPassword) {
      throw new Error("Password confirmation is required to delete your account.");
    }

    const isValid = await verifyPassword(confirmedPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Incorrect password. Account deletion aborted.");
    }
  }

  // 2. Cascade Purge Across All Collections
  const [
    txCol,
    accCol,
    catCol,
    budCol,
    recCol,
    notCol,
    impCol,
  ] = await Promise.all([
    getCollection<TransactionDocument>("transactions"),
    getCollection<AccountDocument>("accounts"),
    getCollection<CategoryDocument>("categories"),
    getCollection<BudgetDocument>("budgets"),
    getCollection<RecurringDocument>("recurring"),
    getCollection<NotificationDocument>("notifications"),
    getCollection<ImportDocument>("imports"),
  ]);

  const [
    txRes,
    accRes,
    catRes,
    budRes,
    recRes,
    notRes,
    impRes,
  ] = await Promise.all([
    txCol.deleteMany({ userId }),
    accCol.deleteMany({ userId }),
    catCol.deleteMany({ userId }),
    budCol.deleteMany({ userId }),
    recCol.deleteMany({ userId }),
    notCol.deleteMany({ userId }),
    impCol.deleteMany({ userId }),
  ]);

  // 3. Delete the user document itself
  await usersCol.deleteOne({ _id: new ObjectId(userId) });

  // 4. Invalidate Session Cookie
  await clearSessionCookie();

  safeLogger.info(`Account deleted permanently for user ID: ${userId}`, {
    deletedTransactions: txRes.deletedCount,
    deletedAccounts: accRes.deletedCount,
  });

  return {
    success: true,
    deletedCounts: {
      transactions: txRes.deletedCount,
      accounts: accRes.deletedCount,
      categories: catRes.deletedCount,
      budgets: budRes.deletedCount,
      recurring: recRes.deletedCount,
      notifications: notRes.deletedCount,
      imports: impRes.deletedCount,
    },
  };
}
