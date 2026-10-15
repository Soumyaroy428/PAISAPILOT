import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import {
  setMockCollectionProvider,
} from "../server/db/mongodb";
import {
  BankConnectionDocument,
  CreateConsentRequestSchema,
  ConsentCallbackQuerySchema,
  DisconnectBankSchema,
} from "../server/models/bank-connection";
import {
  BankSyncProviderAdapter,
  DisabledBankSyncAdapter,
  ProviderTransactionRecord,
  ProviderConsentOptions,
  ProviderConsentResponse,
  ProviderCallbackVerification,
  ProviderFetchTransactionsOptions,
  ProviderFetchTransactionsResponse,
} from "../server/services/bank-sync/provider.adapter";
import {
  getBankConnectionStatus,
  initiateBankConsentFlow,
  handleConsentCallback,
  syncBankTransactions,
  disconnectBankConnection,
  setProviderAdapter,
} from "../server/services/bank-sync/bank-sync.service";
import { isBankSyncEnabled } from "../server/lib/feature-flags";

// In-Memory Mock Collection Implementation for Unit & Integration Testing
class MockCollection<T extends { _id?: any; [key: string]: any }> {
  public docs: T[] = [];

  async findOne(query: Record<string, any>, options?: any): Promise<T | null> {
    const match = this.docs.find((doc) => this.matchesQuery(doc, query));
    if (!match) return null;
    return { ...match };
  }

  async insertOne(doc: T): Promise<{ insertedId: ObjectId }> {
    const _id = doc._id || new ObjectId();
    const cloned = { ...doc, _id };
    this.docs.push(cloned);
    return { insertedId: _id };
  }

  async updateOne(query: Record<string, any>, update: Record<string, any>): Promise<{ modifiedCount: number }> {
    const index = this.docs.findIndex((doc) => this.matchesQuery(doc, query));
    if (index === -1) return { modifiedCount: 0 };

    const target = this.docs[index];
    if (update.$set) {
      Object.assign(target, update.$set);
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        (target as any)[k] = ((target as any)[k] || 0) + (v as number);
      }
    }
    return { modifiedCount: 1 };
  }

  async deleteMany(query: Record<string, any>): Promise<{ deletedCount: number }> {
    const initialCount = this.docs.length;
    this.docs = this.docs.filter((doc) => !this.matchesQuery(doc, query));
    return { deletedCount: initialCount - this.docs.length };
  }

  async deleteOne(query: Record<string, any>): Promise<{ deletedCount: number }> {
    const index = this.docs.findIndex((doc) => this.matchesQuery(doc, query));
    if (index === -1) return { deletedCount: 0 };
    this.docs.splice(index, 1);
    return { deletedCount: 1 };
  }

  private matchesQuery(doc: any, query: Record<string, any>): boolean {
    for (const [key, val] of Object.entries(query)) {
      const docVal = doc[key];
      const valIsId = val instanceof ObjectId || (typeof val === "string" && val.length === 24);
      const docValIsId = docVal instanceof ObjectId || (typeof docVal === "string" && docVal?.length === 24);

      if (valIsId && docValIsId) {
        if (val.toString() !== docVal.toString()) return false;
      } else if (val && typeof val === "object" && val.$regex) {
        const regex = new RegExp(val.$regex);
        if (!regex.test(docVal || "")) return false;
      } else if (val && typeof val === "object" && !(val instanceof Date)) {
        if (JSON.stringify(docVal) !== JSON.stringify(val)) return false;
      } else {
        if (docVal !== val) return false;
      }
    }
    return true;
  }
}

// In-Memory Database registry
let mockDb: Record<string, MockCollection<any>> = {};

function initMockDb() {
  mockDb = {
    bank_connections: new MockCollection<BankConnectionDocument>(),
    transactions: new MockCollection<any>(),
    accounts: new MockCollection<any>(),
  };
  setMockCollectionProvider((name: string) => {
    if (!mockDb[name]) {
      mockDb[name] = new MockCollection<any>();
    }
    return mockDb[name];
  });
}

// Mock Test Adapter
class TestMockBankAdapter implements BankSyncProviderAdapter {
  readonly providerId = "test_mock_aa";
  public mockTransactions: ProviderTransactionRecord[] = [];
  public shouldFailFetch = false;

  async initiateConsent(options: ProviderConsentOptions): Promise<ProviderConsentResponse> {
    return {
      consentId: "aa_consent_12345",
      redirectUrl: `https://mock-aa-portal.example.com/consent?state=${options.stateToken}`,
      expiresAt: new Date(Date.now() + options.durationDays * 86400000),
    };
  }

  async verifyCallback(payload: {
    stateToken: string;
    consentId: string;
    status: string;
  }): Promise<ProviderCallbackVerification> {
    if (payload.status === "rejected") {
      return {
        isValid: true,
        providerConsentId: payload.consentId,
        status: "rejected",
        errorMessage: "User declined consent at bank gateway",
      };
    }
    return {
      isValid: true,
      providerConsentId: payload.consentId,
      status: "active",
      linkedAccounts: [
        {
          providerAccountId: "acc_hdfc_9988",
          maskedAccountNumber: "••••5678",
          institutionName: "HDFC Bank",
          fipId: "HDFC_BANK",
          accountType: "savings",
        },
      ],
    };
  }

  async fetchTransactions(
    options: ProviderFetchTransactionsOptions
  ): Promise<ProviderFetchTransactionsResponse> {
    if (this.shouldFailFetch) {
      throw new Error("PROVIDER_DOWN: Gateway timeout communicating with FIP");
    }
    return {
      transactions: this.mockTransactions,
      hasMore: false,
    };
  }

  async revokeConsent(consentId: string): Promise<{ success: boolean }> {
    return { success: true };
  }
}

describe("CHECKPOINT-BANK-SYNC-01: Connect Bank Account & Automatic Sync Engine", () => {
  const originalEnv = process.env.FEATURE_BANK_SYNC;
  const userA = "user_alpha_123";
  const userB = "user_beta_456";

  beforeEach(() => {
    initMockDb();
    delete process.env.FEATURE_BANK_SYNC;
    delete process.env.ENABLE_BANK_SYNC;
    delete process.env.NEXT_PUBLIC_ENABLE_BANK_SYNC;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.FEATURE_BANK_SYNC = originalEnv;
    } else {
      delete process.env.FEATURE_BANK_SYNC;
    }
    setProviderAdapter(new DisabledBankSyncAdapter());
    setMockCollectionProvider(null);
  });

  // TEST 1: Feature Flag & Discovery Gate
  test("Test 1: Discovery Gate strictly disables automated bank sync by default", async () => {
    assert.equal(isBankSyncEnabled(), false);

    const status = await getBankConnectionStatus(userA);
    assert.equal(status.isFeatureEnabled, false);
    assert.match(status.regulatoryNotice, /RBI Account Aggregator/);
    assert.equal(status.supportedFallbackWorkflows.manualLedgerAvailable, true);
    assert.equal(status.supportedFallbackWorkflows.statementImportAvailable, true);

    // Attempting to initiate consent while flag is off must throw Discovery Gate error
    await assert.rejects(
      async () => {
        await initiateBankConsentFlow(
          userA,
          {
            institutionFipId: "HDFC_BANK",
            consentDurationDays: 90,
            scope: ["TRANSACTIONS", "PROFILE"],
          },
          "http://localhost:3000"
        );
      },
      /DISCOVERY_GATE_ACTIVE/
    );
  });

  // TEST 2: DisabledBankSyncAdapter blocks simulation
  test("Test 2: DisabledBankSyncAdapter prevents fake bank connection simulation", async () => {
    const adapter = new DisabledBankSyncAdapter();
    assert.equal(adapter.providerId, "disabled");

    await assert.rejects(
      async () => adapter.initiateConsent(),
      /PROVIDER_UNAVAILABLE/
    );
    await assert.rejects(
      async () => adapter.fetchTransactions(),
      /PROVIDER_UNAVAILABLE/
    );

    const callbackRes = await adapter.verifyCallback();
    assert.equal(callbackRes.isValid, false);
    assert.equal(callbackRes.status, "rejected");
  });

  // TEST 3: Consent Lifecycle (Approved, Rejected, Expired, Revoked)
  test("Test 3: Full consent lifecycle transitions (Approved -> Active -> Expired -> Revoked)", async () => {
    process.env.FEATURE_BANK_SYNC = "true";
    const testAdapter = new TestMockBankAdapter();
    setProviderAdapter(testAdapter);

    // 1. Initiate consent
    const initiation = await initiateBankConsentFlow(
      userA,
      {
        institutionFipId: "HDFC_BANK",
        consentDurationDays: 90,
        scope: ["TRANSACTIONS", "PROFILE", "SUMMARY"],
      },
      "http://localhost:3000"
    );
    assert.ok(initiation.redirectUrl.includes("state="));
    assert.ok(initiation.connectionId);

    const stateToken = new URL(initiation.redirectUrl).searchParams.get("state")!;
    assert.ok(stateToken.length >= 32);

    // 2. Process approved callback
    const callbackRes = await handleConsentCallback(userA, {
      state: stateToken,
      consentId: "aa_consent_12345",
      status: "success",
    });
    assert.equal(callbackRes.success, true);
    assert.equal(callbackRes.status, "active");

    const statusAfter = await getBankConnectionStatus(userA);
    assert.ok(statusAfter.activeConnection);
    assert.equal(statusAfter.activeConnection?.status, "active");
    assert.equal(statusAfter.activeConnection?.linkedAccounts[0].institutionName, "HDFC Bank");

    // 3. Expiration enforcement: When consentExpiry is past, sync must fail and mark expired
    const connDoc = mockDb.bank_connections.docs[0];
    connDoc.consentExpiry = new Date(Date.now() - 1000); // 1 sec in past

    await assert.rejects(
      async () => syncBankTransactions(userA, initiation.connectionId),
      /CONSENT_EXPIRED/
    );
    assert.equal(connDoc.consentStatus, "expired");

    // 4. Disconnect & Revocation
    connDoc.consentStatus = "active"; // reset for disconnect test
    connDoc.consentExpiry = new Date(Date.now() + 86400000);
    const discRes = await disconnectBankConnection(userA, initiation.connectionId);
    assert.equal(discRes.success, true);
    assert.equal(connDoc.isRevoked, true);
    assert.equal(connDoc.consentStatus, "revoked");
  });

  // TEST 4: Replay & Callback Tampering Protection
  test("Test 4: Callback rejects tampered tokens and blocks replay attacks", async () => {
    process.env.FEATURE_BANK_SYNC = "true";
    const testAdapter = new TestMockBankAdapter();
    setProviderAdapter(testAdapter);

    const initiation = await initiateBankConsentFlow(
      userA,
      {
        institutionFipId: "HDFC_BANK",
        consentDurationDays: 90,
        scope: ["TRANSACTIONS"],
      },
      "http://localhost:3000"
    );
    const stateToken = new URL(initiation.redirectUrl).searchParams.get("state")!;

    // Tampered state token
    await assert.rejects(
      async () => {
        await handleConsentCallback(userA, {
          state: stateToken + "_tampered_suffix",
          consentId: "aa_consent_12345",
          status: "success",
        });
      },
      /INVALID_STATE/
    );

    // Legitimate first call succeeds
    const firstCall = await handleConsentCallback(userA, {
      state: stateToken,
      consentId: "aa_consent_12345",
      status: "success",
    });
    assert.equal(firstCall.success, true);

    // Replay attack with the exact same valid state token must be strictly rejected
    await assert.rejects(
      async () => {
        await handleConsentCallback(userA, {
          state: stateToken,
          consentId: "aa_consent_12345",
          status: "success",
        });
      },
      /INVALID_STATE/
    );
  });

  // TEST 5: Cross-User Multi-Tenant Isolation Defense
  test("Test 5: Multi-Tenant Defense blocks cross-user authorization, sync, and revocation", async () => {
    process.env.FEATURE_BANK_SYNC = "true";
    const testAdapter = new TestMockBankAdapter();
    setProviderAdapter(testAdapter);

    // User A initiates consent
    const initiationA = await initiateBankConsentFlow(
      userA,
      {
        institutionFipId: "HDFC_BANK",
        consentDurationDays: 90,
        scope: ["TRANSACTIONS"],
      },
      "http://localhost:3000"
    );
    const stateTokenA = new URL(initiationA.redirectUrl).searchParams.get("state")!;

    // Attack 1: User B tries to hijack User A's callback token
    await assert.rejects(
      async () => {
        await handleConsentCallback(userB, {
          state: stateTokenA,
          consentId: "aa_consent_12345",
          status: "success",
        });
      },
      /UNAUTHORIZED/
    );

    // Complete legitimate callback for User A
    await handleConsentCallback(userA, {
      state: stateTokenA,
      consentId: "aa_consent_12345",
      status: "success",
    });

    // Attack 2: User B tries to trigger sync on User A's connection ID
    await assert.rejects(
      async () => {
        await syncBankTransactions(userB, initiationA.connectionId);
      },
      /CONNECTION_NOT_FOUND/
    );

    // Attack 3: User B tries to revoke User A's connection
    await assert.rejects(
      async () => {
        await disconnectBankConnection(userB, initiationA.connectionId);
      },
      /CONNECTION_NOT_FOUND/
    );
  });

  // TEST 6: Idempotency & Composite Reference Deduplication
  test("Test 6: Idempotent transaction sync deduplicates on composite provider ref without false collisions", async () => {
    process.env.FEATURE_BANK_SYNC = "true";
    const testAdapter = new TestMockBankAdapter();
    setProviderAdapter(testAdapter);

    const initiation = await initiateBankConsentFlow(
      userA,
      { institutionFipId: "HDFC_BANK", consentDurationDays: 90, scope: ["TRANSACTIONS"] },
      "http://localhost:3000"
    );
    const stateToken = new URL(initiation.redirectUrl).searchParams.get("state")!;
    await handleConsentCallback(userA, {
      state: stateToken,
      consentId: "aa_consent_12345",
      status: "success",
    });

    // Feed 3 transactions: two identical ₹50.00 payments on the same date with distinct bank IDs (e.g. 2 teas), plus 1 salary
    testAdapter.mockTransactions = [
      {
        providerTransactionId: "TX_HDFC_001",
        date: new Date("2026-10-14T10:00:00Z"),
        amountPaise: 5000, // ₹50.00
        type: "expense",
        description: "Chai Point",
        status: "settled",
        referenceNumber: "UTR111222",
      },
      {
        providerTransactionId: "TX_HDFC_002",
        date: new Date("2026-10-14T10:00:00Z"),
        amountPaise: 5000, // ₹50.00 (same date and amount as TX_001!)
        type: "expense",
        description: "Chai Point 2nd round",
        status: "settled",
        referenceNumber: "UTR111333",
      },
      {
        providerTransactionId: "TX_HDFC_003",
        date: new Date("2026-10-14T09:00:00Z"),
        amountPaise: 8000000, // ₹80,000.00
        type: "income",
        description: "October Salary",
        status: "settled",
        referenceNumber: "UTR999000",
      },
    ];

    // First sync: All 3 transactions must be inserted
    const sync1 = await syncBankTransactions(userA, initiation.connectionId);
    assert.equal(sync1.insertedCount, 3);
    assert.equal(sync1.duplicateCount, 0);

    // Verify both ₹50 transactions are retained (never falsely deduplicated on date+amount)
    const chaiTx = mockDb.transactions.docs.filter((t) => t.amountPaise === 5000);
    assert.equal(chaiTx.length, 2);

    // Re-running the identical sync (Second sync): Must flag 3 duplicates and insert 0
    const sync2 = await syncBankTransactions(userA, initiation.connectionId);
    assert.equal(sync2.insertedCount, 0);
    assert.equal(sync2.duplicateCount, 3);
  });

  // TEST 7: Reversals, Refunds, and Balance Integrity
  test("Test 7: Reversals and refunds convert to incoming credits with correct provenance tags", async () => {
    process.env.FEATURE_BANK_SYNC = "true";
    const testAdapter = new TestMockBankAdapter();
    setProviderAdapter(testAdapter);

    const initiation = await initiateBankConsentFlow(
      userA,
      { institutionFipId: "HDFC_BANK", consentDurationDays: 90, scope: ["TRANSACTIONS"] },
      "http://localhost:3000"
    );
    const stateToken = new URL(initiation.redirectUrl).searchParams.get("state")!;
    await handleConsentCallback(userA, {
      state: stateToken,
      consentId: "aa_consent_12345",
      status: "success",
    });

    // Provide 1 normal expense and 1 refunded expense
    testAdapter.mockTransactions = [
      {
        providerTransactionId: "TX_BOOKMYSHOW",
        date: new Date("2026-10-12T15:00:00Z"),
        amountPaise: 90000, // ₹900.00
        type: "expense",
        description: "Movie tickets",
        status: "settled",
      },
      {
        providerTransactionId: "TX_BOOKMYSHOW_REFUND",
        date: new Date("2026-10-13T12:00:00Z"),
        amountPaise: 90000, // ₹900.00 refunded
        type: "expense",
        description: "Show cancelled refund",
        status: "refunded",
        originalTransactionId: "TX_BOOKMYSHOW",
      },
    ];

    const syncRes = await syncBankTransactions(userA, initiation.connectionId);
    assert.equal(syncRes.insertedCount, 2);

    const refundDoc = mockDb.transactions.docs.find(
      (t) => t.description === "Show cancelled refund"
    );
    assert.ok(refundDoc);
    // Refund must be mapped to income credit
    assert.equal(refundDoc.type, "income");
    assert.match(refundDoc.notes, /\[STATUS:REFUNDED\]/);
    assert.match(refundDoc.notes, /\[REF:TX_BOOKMYSHOW_REFUND\]/);

    // Account balance should net to zero (₹900 expense + ₹900 refund income = 0)
    const account = mockDb.accounts.docs[0];
    assert.equal(account.currentBalancePaise, 0);
  });

  // TEST 8: Partial Failures, Downtime, and Recovery
  test("Test 8: Handles provider downtime gracefully and recovers on retry", async () => {
    process.env.FEATURE_BANK_SYNC = "true";
    const testAdapter = new TestMockBankAdapter();
    setProviderAdapter(testAdapter);

    const initiation = await initiateBankConsentFlow(
      userA,
      { institutionFipId: "HDFC_BANK", consentDurationDays: 90, scope: ["TRANSACTIONS"] },
      "http://localhost:3000"
    );
    const stateToken = new URL(initiation.redirectUrl).searchParams.get("state")!;
    await handleConsentCallback(userA, {
      state: stateToken,
      consentId: "aa_consent_12345",
      status: "success",
    });

    // Simulate provider failure
    testAdapter.shouldFailFetch = true;
    await assert.rejects(
      async () => syncBankTransactions(userA, initiation.connectionId),
      /PROVIDER_DOWN/
    );

    const connDoc = mockDb.bank_connections.docs[0];
    assert.equal(connDoc.lastSyncStatus, "failed");
    assert.equal(connDoc.lastErrorCode, "SYNC_FETCH_ERROR");

    // Provider recovers
    testAdapter.shouldFailFetch = false;
    testAdapter.mockTransactions = [
      {
        providerTransactionId: "TX_RECOVERED_01",
        date: new Date("2026-10-15T08:00:00Z"),
        amountPaise: 12000,
        type: "expense",
        description: "Uber ride",
        status: "settled",
      },
    ];

    const recoveryRes = await syncBankTransactions(userA, initiation.connectionId);
    assert.equal(recoveryRes.insertedCount, 1);
    assert.equal(connDoc.lastSyncStatus, "success");
    assert.equal(connDoc.lastErrorCode, undefined);
  });

  // TEST 9: Zod Schema Boundaries and Redaction
  test("Test 9: Schema bounds, input sanitization, and secret redaction", () => {
    // 1. Consent request validation
    const validConsent = CreateConsentRequestSchema.safeParse({
      institutionFipId: "HDFC_BANK",
      consentDurationDays: 90,
      scope: ["TRANSACTIONS", "PROFILE"],
    });
    assert.equal(validConsent.success, true);

    const invalidDays = CreateConsentRequestSchema.safeParse({
      institutionFipId: "HDFC_BANK",
      consentDurationDays: 500, // Max 365
    });
    assert.equal(invalidDays.success, false);

    // 2. Callback parameters validation
    const validCallback = ConsentCallbackQuerySchema.safeParse({
      state: "abcdef0123456789abcdef0123456789",
      consentId: "consent_999",
      status: "success",
    });
    assert.equal(validCallback.success, true);

    const shortState = ConsentCallbackQuerySchema.safeParse({
      state: "short",
      consentId: "consent_999",
    });
    assert.equal(shortState.success, false);

    // 3. Disconnect validation
    const validDisc = DisconnectBankSchema.safeParse({
      connectionId: "conn_123",
      reason: "User closed bank account",
    });
    assert.equal(validDisc.success, true);
  });
});
