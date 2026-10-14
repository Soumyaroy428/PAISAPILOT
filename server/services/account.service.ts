import { ObjectId } from "mongodb";
import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import {
  AccountDocument,
  CreateAccountInput,
  UpdateAccountInput,
} from "@/server/models/account";

/**
 * Returns all active accounts for the authenticated user.
 * Seeds default payment accounts (Bank, UPI, Cash) if none exist.
 */
export async function getAccounts(userId: string): Promise<AccountDocument[]> {
  await ensureDatabaseIndexes();
  const accountsCol = await getCollection<AccountDocument>("accounts");

  const accounts = await accountsCol
    .find({ userId, isArchived: false })
    .sort({ createdAt: -1 })
    .toArray();

  if (accounts.length === 0) {
    return seedDefaultAccounts(userId);
  }

  return accounts;
}

/**
 * Seeds baseline payment sources for a newly onboarded user.
 */
export async function seedDefaultAccounts(userId: string): Promise<AccountDocument[]> {
  const accountsCol = await getCollection<AccountDocument>("accounts");

  const defaults: Omit<AccountDocument, "_id">[] = [
    {
      userId,
      name: "Primary Bank Account",
      type: "bank_account",
      institution: "Bank",
      accountNumberMasked: "•••• 0001",
      currency: "INR",
      currentBalancePaise: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId,
      name: "UPI Wallet (GPay / PhonePe)",
      type: "upi",
      institution: "UPI",
      accountNumberMasked: "user@upi",
      currency: "INR",
      currentBalancePaise: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId,
      name: "Cash in Hand",
      type: "cash",
      currency: "INR",
      currentBalancePaise: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await accountsCol.insertMany(defaults as any);
  return accountsCol.find({ userId, isArchived: false }).toArray();
}

/**
 * Creates a new account for the user.
 */
export async function createAccount(
  userId: string,
  input: CreateAccountInput
): Promise<AccountDocument> {
  await ensureDatabaseIndexes();
  const accountsCol = await getCollection<AccountDocument>("accounts");

  const newAccount: Omit<AccountDocument, "_id"> = {
    userId,
    name: input.name,
    type: input.type,
    institution: input.institution,
    accountNumberMasked: input.accountNumberMasked,
    currency: "INR",
    currentBalancePaise: input.initialBalancePaise || 0,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await accountsCol.insertOne(newAccount as any);
  return {
    _id: res.insertedId,
    ...newAccount,
  } as unknown as AccountDocument;
}

/**
 * Retrieves a single account belonging strictly to the user.
 */
export async function getAccountById(
  userId: string,
  accountId: string
): Promise<AccountDocument | null> {
  if (!ObjectId.isValid(accountId)) return null;

  const accountsCol = await getCollection<AccountDocument>("accounts");
  return accountsCol.findOne({
    _id: new ObjectId(accountId),
    userId,
  });
}

/**
 * Updates an existing account's details.
 */
export async function updateAccount(
  userId: string,
  accountId: string,
  input: UpdateAccountInput
): Promise<AccountDocument | null> {
  if (!ObjectId.isValid(accountId)) return null;

  const accountsCol = await getCollection<AccountDocument>("accounts");
  const updateFields: Partial<AccountDocument> = {
    ...input,
    updatedAt: new Date(),
  };

  const res = await accountsCol.findOneAndUpdate(
    { _id: new ObjectId(accountId), userId },
    { $set: updateFields },
    { returnDocument: "after" }
  );

  return res;
}

/**
 * Soft-deletes (archives) an account.
 */
export async function archiveAccount(
  userId: string,
  accountId: string
): Promise<boolean> {
  if (!ObjectId.isValid(accountId)) return false;

  const accountsCol = await getCollection<AccountDocument>("accounts");
  const res = await accountsCol.updateOne(
    { _id: new ObjectId(accountId), userId },
    { $set: { isArchived: true, updatedAt: new Date() } }
  );

  return res.modifiedCount > 0;
}

/**
 * Atomically adjusts an account balance by a given delta in paise.
 * Positive delta increases balance; negative delta decreases balance.
 */
export async function adjustAccountBalance(
  userId: string,
  accountId: string,
  deltaPaise: number
): Promise<void> {
  if (!ObjectId.isValid(accountId) || deltaPaise === 0) return;

  const accountsCol = await getCollection<AccountDocument>("accounts");
  await accountsCol.updateOne(
    { _id: new ObjectId(accountId), userId },
    {
      $inc: { currentBalancePaise: deltaPaise },
      $set: { updatedAt: new Date() },
    }
  );
}
