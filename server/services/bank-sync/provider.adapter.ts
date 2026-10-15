/**
 * Bank Synchronization Provider Adapter Interface
 *
 * Ensures that Account Aggregator (AA) or bank-specific payloads do not leak
 * into domain or UI code.
 */

export interface ProviderConsentOptions {
  userId: string;
  institutionFipId: string;
  durationDays: number;
  scopes: string[];
  redirectUrl: string;
  stateToken: string;
}

export interface ProviderConsentResponse {
  consentId: string;
  redirectUrl: string;
  expiresAt: Date;
}

export interface ProviderCallbackVerification {
  isValid: boolean;
  providerConsentId: string;
  status: "active" | "rejected" | "expired" | "revoked";
  linkedAccounts?: Array<{
    providerAccountId: string;
    maskedAccountNumber: string;
    institutionName: string;
    fipId: string;
    accountType?: string;
  }>;
  errorMessage?: string;
}

export interface ProviderTransactionRecord {
  providerTransactionId: string; // Stable provider / bank transaction ID
  date: Date;
  amountPaise: number; // Integer paise
  type: "income" | "expense" | "transfer";
  description: string;
  status: "settled" | "pending" | "reversed" | "refunded";
  referenceNumber?: string; // UTR or bank reference
  merchantName?: string;
  accountMasked?: string;
  originalTransactionId?: string; // For reversals / refunds referencing earlier transactions
}

export interface ProviderFetchTransactionsOptions {
  consentId: string;
  fromDate: Date;
  toDate: Date;
  cursor?: string;
}

export interface ProviderFetchTransactionsResponse {
  transactions: ProviderTransactionRecord[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface BankSyncProviderAdapter {
  readonly providerId: string;
  initiateConsent(options: ProviderConsentOptions): Promise<ProviderConsentResponse>;
  verifyCallback(payload: {
    stateToken: string;
    consentId: string;
    status: string;
  }): Promise<ProviderCallbackVerification>;
  fetchTransactions(
    options: ProviderFetchTransactionsOptions
  ): Promise<ProviderFetchTransactionsResponse>;
  revokeConsent(consentId: string): Promise<{ success: boolean }>;
}

/**
 * Disabled Provider Adapter
 *
 * Enforces the non-negotiable rule:
 * "Do not simulate successful bank connection when provider configuration is absent."
 */
export class DisabledBankSyncAdapter implements BankSyncProviderAdapter {
  readonly providerId = "disabled";

  async initiateConsent(): Promise<ProviderConsentResponse> {
    throw new Error(
      "PROVIDER_UNAVAILABLE: Bank synchronization is currently in Discovery Gate / Regulatory Compliance stage. Live connections are disabled."
    );
  }

  async verifyCallback(): Promise<ProviderCallbackVerification> {
    return {
      isValid: false,
      providerConsentId: "",
      status: "rejected",
      errorMessage: "Provider adapter is disabled.",
    };
  }

  async fetchTransactions(): Promise<ProviderFetchTransactionsResponse> {
    throw new Error("PROVIDER_UNAVAILABLE: Bank data synchronization is disabled.");
  }

  async revokeConsent(): Promise<{ success: boolean }> {
    return { success: true };
  }
}

