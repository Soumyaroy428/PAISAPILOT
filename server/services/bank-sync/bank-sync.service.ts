import { ObjectId } from "mongodb";
import crypto from "crypto";
import { getCollection } from "@/server/db/mongodb";
import {
  BankConnectionDocument,
  BankConsentStatus,
  CreateConsentRequestInput,
  ConsentCallbackQuery,
} from "@/server/models/bank-connection";
import {
  TransactionDocument,
  TransactionType,
} from "@/server/models/transaction";
import { AccountDocument } from "@/server/models/account";
import {
  BankSyncProviderAdapter,
  DisabledBankSyncAdapter,
  ProviderTransactionRecord,
} from "./provider.adapter";
import { isBankSyncEnabled } from "@/server/lib/feature-flags";
import { safeLogger } from "@/server/lib/privacy-logger";

// In-memory state store for CSRF correlation with 15-minute TTL
interface StateSession {
  userId: string;
  connectionId: string;
  createdAt: number;
}
const stateStore = new Map<string, StateSession>();

// Cleanup expired states periodically
function cleanExpiredStates() {
  const now = Date.now();
  for (const [token, session] of stateStore.entries()) {
    if (now - session.createdAt > 15 * 60 * 1000) {
      stateStore.delete(token);
    }
  }
}

let activeAdapter: BankSyncProviderAdapter = new DisabledBankSyncAdapter();

/**
 * Configure the active provider adapter (allows dependency injection for testing)
 */
export function setProviderAdapter(adapter: BankSyncProviderAdapter) {
  activeAdapter = adapter;
}

export function getProviderAdapter(): BankSyncProviderAdapter {
  return activeAdapter;
}

export interface BankConnectionPublicStatus {
  isFeatureEnabled: boolean;
  regulatoryNotice: string;
  activeConnection: {
    id: string;
    provider: string;
    status: BankConsentStatus;
    consentExpiry?: string;
    lastSuccessfulSyncAt?: string;
    lastSyncStatus?: string;
    lastErrorCode?: string;
    linkedAccounts: Array<{
      maskedAccountNumber: string;
      institutionName: string;
    }>;
  } | null;
  supportedFallbackWorkflows: {
    manualLedgerAvailable: boolean;
    statementImportAvailable: boolean;
  };
}

/**
 * Returns connection and regulatory status for authenticated user.
 */
export async function getBankConnectionStatus(
  userId: string
): Promise<BankConnectionPublicStatus> {
  const enabled = isBankSyncEnabled();

  const col = await getCollection<BankConnectionDocument>("bank_connections");
  const connection = await col.findOne(
    { userId, isRevoked: false },
    { sort: { createdAt: -1 } }
  );

  return {
    isFeatureEnabled: enabled,
    regulatoryNotice:
      "Under the RBI Account Aggregator framework, data sharing requires user consent through a licensed FIU. PaisaPilot never requests banking passwords or UPI PINs. Historical bank statement sync is not a real-time guarantee of current bank balances.",
    activeConnection: connection
      ? {
          id: connection._id!.toString(),
          provider: connection.provider,
          status: connection.consentStatus,
          consentExpiry: new Date(connection.consentExpiry).toISOString(),
          lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt
            ? new Date(connection.lastSuccessfulSyncAt).toISOString()
            : undefined,
          lastSyncStatus: connection.lastSyncStatus,
          lastErrorCode: connection.lastErrorCode,
          linkedAccounts: connection.linkedAccounts.map((a) => ({
            maskedAccountNumber: a.maskedAccountNumber,
            institutionName: a.institutionName,
          })),
        }
      : null,
    supportedFallbackWorkflows: {
      manualLedgerAvailable: true,
      statementImportAvailable: true,
    },
  };
}

/**
 * Initiates the consent flow with state and replay protection.
 */
export async function initiateBankConsentFlow(
  userId: string,
  input: CreateConsentRequestInput,
  baseUrl: string
): Promise<{ redirectUrl: string; connectionId: string }> {
  if (!isBankSyncEnabled()) {
    throw new Error(
      "DISCOVERY_GATE_ACTIVE: Automatic bank synchronization is currently disabled pending formal regulatory FIU registration. Please use statement imports (PhonePe / SBI PDF & CSV)."
    );
  }

  cleanExpiredStates();

  const col = await getCollection<BankConnectionDocument>("bank_connections");

  // Replay & CSRF Protection: Generate cryptographically secure state token
  const stateToken = crypto.randomBytes(32).toString("hex");

  const fromDate = new Date();
  const toDate = new Date(Date.now() + input.consentDurationDays * 24 * 60 * 60 * 1000);

  const newDoc: BankConnectionDocument = {
    userId,
    provider: activeAdapter.providerId,
    providerConsentId: "pending_" + Date.now(),
    consentStatus: "pending_consent",
    consentScope: input.scope,
    consentDuration: { from: fromDate, to: toDate },
    consentExpiry: toDate,
    linkedAccounts: [],
    correlationId: stateToken,
    isRevoked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const insertRes = await col.insertOne(newDoc);
  const connectionId = insertRes.insertedId.toString();

  // Save correlation token in server memory with 15-minute TTL
  stateStore.set(stateToken, {
    userId,
    connectionId,
    createdAt: Date.now(),
  });

  const redirectUrl = `${baseUrl}/api/bank-sync/callback`;

  try {
    const providerRes = await activeAdapter.initiateConsent({
      userId,
      institutionFipId: input.institutionFipId,
      durationDays: input.consentDurationDays,
      scopes: input.scope,
      redirectUrl,
      stateToken,
    });

    // Update connection with actual provider consent ID
    await col.updateOne(
      { _id: insertRes.insertedId },
      {
        $set: {
          providerConsentId: providerRes.consentId,
          updatedAt: new Date(),
        },
      }
    );

    safeLogger.info("Initiated bank consent request", {
      userId,
      connectionId,
      institutionFipId: input.institutionFipId,
    });

    return {
      redirectUrl: providerRes.redirectUrl,
      connectionId,
    };
  } catch (err: any) {
    await col.updateOne(
      { _id: insertRes.insertedId },
      {
        $set: {
          consentStatus: "rejected",
          lastErrorCode: "INITIATION_FAILED",
          updatedAt: new Date(),
        },
      }
    );
    throw err;
  }
}

/**
 * Handles provider consent callback with state validation.
 */
export async function handleConsentCallback(
  userId: string,
  query: ConsentCallbackQuery
): Promise<{ success: boolean; status: BankConsentStatus }> {
  cleanExpiredStates();

  const stateSession = stateStore.get(query.state);

  // 1. Replay and CSRF Defense
  if (!stateSession) {
    safeLogger.warn("Bank consent callback rejected: Invalid or expired state token");
    throw new Error("INVALID_STATE: The authorization session is invalid or has expired.");
  }

  // 2. Owner Isolation Defense: State session must match authenticated user
  if (stateSession.userId !== userId) {
    safeLogger.warn("Cross-user bank callback attempt blocked", {
      sessionUser: userId,
      stateUser: stateSession.userId,
    });
    throw new Error("UNAUTHORIZED: State token does not belong to the current authenticated session.");
  }

  // Consume state token (prevent replay attacks)
  stateStore.delete(query.state);

  const col = await getCollection<BankConnectionDocument>("bank_connections");
  const connection = await col.findOne({
    _id: new ObjectId(stateSession.connectionId),
    userId,
  });

  if (!connection) {
    throw new Error("CONNECTION_NOT_FOUND: Linked bank connection record was not found.");
  }

  // 3. Verify provider response
  const verification = await activeAdapter.verifyCallback({
    stateToken: query.state,
    consentId: query.consentId,
    status: query.status,
  });

  const finalStatus: BankConsentStatus = verification.isValid && verification.status === "active"
    ? "active"
    : verification.status;

  await col.updateOne(
    { _id: new ObjectId(connection._id) },
    {
      $set: {
        consentStatus: finalStatus,
        providerConsentId: verification.providerConsentId || query.consentId,
        linkedAccounts: verification.linkedAccounts || connection.linkedAccounts,
        lastErrorCode: verification.errorMessage ? "VERIFICATION_FAILED" : undefined,
        updatedAt: new Date(),
      },
    }
  );

  safeLogger.info("Bank consent callback processed", {
    userId,
    connectionId: connection._id!.toString(),
    finalStatus,
  });

  return {
    success: finalStatus === "active",
    status: finalStatus,
  };
}

/**
 * Synchronizes bank transactions from authorized provider.
 * Idempotent, retry-safe, and preserves transaction provenance.
 */
export async function syncBankTransactions(
  userId: string,
  connectionId: string
): Promise<{
  insertedCount: number;
  duplicateCount: number;
  lastSuccessfulSyncAt: Date;
}> {
  const col = await getCollection<BankConnectionDocument>("bank_connections");
  const connection = await col.findOne({
    _id: new ObjectId(connectionId),
    userId,
    isRevoked: false,
  });

  if (!connection) {
    throw new Error("CONNECTION_NOT_FOUND: Bank connection not found or has been revoked.");
  }

  // Expiration check
  if (connection.consentExpiry < new Date()) {
    await col.updateOne(
      { _id: connection._id },
      { $set: { consentStatus: "expired", updatedAt: new Date() } }
    );
    throw new Error("CONSENT_EXPIRED: User bank sharing consent has expired. Re-authorization required.");
  }

  if (connection.consentStatus !== "active") {
    throw new Error(`CONSENT_NOT_ACTIVE: Current connection status is '${connection.consentStatus}'.`);
  }

  // Mark in progress
  await col.updateOne(
    { _id: connection._id },
    { $set: { lastSyncStatus: "in_progress", updatedAt: new Date() } }
  );

  const fromDate = connection.lastSuccessfulSyncAt || connection.consentDuration.from;
  const toDate = new Date();

  try {
    const fetchRes = await activeAdapter.fetchTransactions({
      consentId: connection.providerConsentId,
      fromDate,
      toDate,
      cursor: connection.syncCursor,
    });

    const txCol = await getCollection<TransactionDocument>("transactions");
    const accCol = await getCollection<AccountDocument>("accounts");

    let insertedCount = 0;
    let duplicateCount = 0;

    // Fetch or map target account
    let targetAccount = await accCol.findOne({
      userId,
      isArchived: false,
    });

    if (!targetAccount) {
      // Auto-create synced bank account representation if none exists
      const newAcc: AccountDocument = {
        userId,
        name: connection.linkedAccounts[0]?.institutionName
          ? `${connection.linkedAccounts[0].institutionName} (Synced)`
          : "Linked Bank Account",
        type: "bank_account",
        institution: connection.linkedAccounts[0]?.institutionName || "Partner Bank",
        accountNumberMasked: connection.linkedAccounts[0]?.maskedAccountNumber || "••••",
        currency: "INR",
        currentBalancePaise: 0,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const insRes = await accCol.insertOne(newAcc);
      targetAccount = { ...newAcc, _id: insRes.insertedId };
    }

    const targetAccountId = targetAccount._id!.toString();
    const targetAccountName = targetAccount.name;

    for (const record of fetchRes.transactions) {
      // Idempotency: Check existing stable provider transaction reference for this user & account
      // "Prefer stable provider/bank transaction IDs; otherwise use a source-account-scoped fingerprint. Never deduplicate solely on date and amount."
      const existing = await txCol.findOne({
        userId,
        accountId: targetAccountId,
        notes: { $regex: new RegExp(`\\[REF:${escapeRegex(record.providerTransactionId)}\\]`) },
      });

      if (existing) {
        duplicateCount++;
        continue;
      }

      // Safe integer paise amount
      const paise = Math.round(record.amountPaise);
      if (paise <= 0) continue;

      const txDate = new Date(record.date);
      const isReversalOrRefund = record.status === "reversed" || record.status === "refunded";

      // Normalize type for reversals/refunds
      let txType: TransactionType = record.type;
      if (isReversalOrRefund && record.type === "expense") {
        // A refund on an expense is an incoming credit
        txType = "income";
      }

      const noteProvenance = `[REF:${record.providerTransactionId}] [PROV:${connection.provider}] ${
        record.referenceNumber ? `[UTR:${record.referenceNumber}]` : ""
      } ${isReversalOrRefund ? `[STATUS:${record.status.toUpperCase()}]` : ""}`.trim();

      const newTx: TransactionDocument = {
        userId,
        type: txType,
        amountPaise: paise,
        currency: "INR",
        transactionDate: txDate,
        description: record.description,
        merchantNormalized: record.merchantName,
        accountId: targetAccountId,
        accountName: targetAccountName,
        paymentMode: "netbanking",
        source: "authorized_provider",
        notes: noteProvenance,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await txCol.insertOne(newTx);

      // Adjust account balance atomically
      const delta = txType === "income" ? paise : -paise;
      await accCol.updateOne(
        { _id: new ObjectId(targetAccountId) },
        {
          $inc: { currentBalancePaise: delta },
          $set: { updatedAt: new Date() },
        }
      );

      insertedCount++;
    }

    const syncTimestamp = new Date();

    await col.updateOne(
      { _id: connection._id },
      {
        $set: {
          lastSuccessfulSyncAt: syncTimestamp,
          lastSyncStatus: "success",
          lastErrorCode: undefined,
          syncCursor: fetchRes.nextCursor,
          updatedAt: new Date(),
        },
      }
    );

    safeLogger.info("Bank sync completed successfully", {
      userId,
      connectionId,
      insertedCount,
      duplicateCount,
    });

    return {
      insertedCount,
      duplicateCount,
      lastSuccessfulSyncAt: syncTimestamp,
    };
  } catch (err: any) {
    await col.updateOne(
      { _id: connection._id },
      {
        $set: {
          lastSyncStatus: "failed",
          lastErrorCode: "SYNC_FETCH_ERROR",
          updatedAt: new Date(),
        },
      }
    );
    throw err;
  }
}

/**
 * Revokes bank connection and terminates future syncs.
 */
export async function disconnectBankConnection(
  userId: string,
  connectionId: string
): Promise<{ success: boolean }> {
  const col = await getCollection<BankConnectionDocument>("bank_connections");
  const connection = await col.findOne({
    _id: new ObjectId(connectionId),
    userId,
  });

  if (!connection) {
    throw new Error("CONNECTION_NOT_FOUND: Bank connection not found.");
  }

  try {
    await activeAdapter.revokeConsent(connection.providerConsentId);
  } catch (err) {
    safeLogger.warn("Provider consent revocation notification returned error, continuing local revocation", {
      connectionId,
    });
  }

  await col.updateOne(
    { _id: connection._id },
    {
      $set: {
        consentStatus: "revoked",
        isRevoked: true,
        updatedAt: new Date(),
      },
    }
  );

  safeLogger.info("Bank connection revoked and disconnected", {
    userId,
    connectionId,
  });

  return { success: true };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
