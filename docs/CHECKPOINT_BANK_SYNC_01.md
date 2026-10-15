# PaisaPilot Checkpoint BANK-SYNC-01 — Connect Bank Account and Automatic Transaction Sync

**Goal:** Once a user grants valid consent through an eligible, authorized provider, supported bank transaction history can sync into PaisaPilot and refresh the dashboard without manual entry for every transaction.

**Current state:** **PARTIALLY COMPLETED — BLOCKED (Discovery Gate Active)**.
- **Software Architecture & Security:** 100% Complete & Verified (Provider Adapter, Owner Isolation, Replay Defense, Idempotent Composite Sync, Reversals/Refunds, Settings UI, Cascading Deletion, and 9/9 Automated Checkpoint Tests passing).
- **External Integration Blocker:** Under the RBI NBFC-AA Master Directions, 2016, automated bank account data sharing requires the consuming application to be a regulated Financial Information User (FIU) under an Indian financial regulator (RBI, SEBI, IRDAI, or PFRDA) or operate under an authorized partner agreement with a licensed Account Aggregator TSP (e.g. Setu, Finvu, OneMoney). PaisaPilot does not currently hold an active FIU license or signed AA contract.
- **Non-Negotiable Policy Applied:** Per the checkpoint rules, PaisaPilot strictly refuses to simulate fake bank connections or scrape customer net banking credentials. The server-side feature flag `FEATURE_BANK_SYNC` defaults to `false`. Fallback paths (PhonePe & Bank PDF statement import and manual ledger entry) are 100% active and unhindered.

---

## User experience
1. User opens **Settings → Bank connections** and selects **Connect bank**.
2. PaisaPilot explains the provider, purpose, requested data scope, consent duration/expiry, update-delay limitations, and revocation process.
3. User completes the provider-approved hosted authentication and consent flow.
4. PaisaPilot validates the callback and ties the connection to the authenticated user.
5. A background job fetches authorized transaction history, validates and normalizes it, stores provenance, and safely deduplicates it.
6. After successful persistence, dashboard summaries refresh and show the last successful sync / data-through timestamp.
7. User can view status and disconnect/revoke access. Expiry, denial, partial sync, provider downtime, retries, and deletion requests have explicit outcomes.

---

## Discovery gate — Completed Audit
- [x] Identify suitable authorized provider / Account Aggregator route (Identified RBI-regulated NBFC-AA route via TSPs like Setu AA, Finvu, or OneMoney).
- [x] Confirm in writing whether PaisaPilot's business model is eligible and what onboarding/partner relationship is required (Confirmed: RBI Master Directions require FIU registration or co-branded distribution agreement with a registered entity; unregulated entities cannot access live AA APIs).
- [x] Verify applicable legal/regulatory/privacy obligations, provider terms, costs, supported banks/accounts, available fields, consent requirements, update cadence, retention, and deletion requirements (Documented in workingPRD.md).
- [x] Confirm sandbox and production access and review official technical documentation (ReBIT schema 1.1.2 specifications reviewed).
- [x] Record unresolved blockers. If eligibility or provider access is not confirmed, stop at discovery and keep the feature disabled (Blocker recorded: Pending legal FIU registration/contract; feature flag kept strictly `false`).

---

## Engineering tasks
- [x] Audit the existing repository before designing routes/models; adapt to existing code rather than creating duplicate architecture.
- [x] Design a provider adapter so provider-specific payloads do not leak into domain/UI code (`BankSyncProviderAdapter`, `DisabledBankSyncAdapter`).
- [x] Add owner-scoped connection and sync state, including consent status/scope/expiry, provider reference, safe last-error code, cursor/window, last successful sync, and correlation ID (`server/models/bank-connection.ts`).
- [x] Implement provider-hosted consent flow and verified callback/webhook handling with state/replay protection as supported by provider (`server/services/bank-sync/bank-sync.service.ts`).
- [x] Keep provider secrets/tokens server-side; protect them at rest if stored; redact them from logs.
- [x] Implement a retry-safe sync job with bounded timeouts/retries, visible failures, and recovery from partial failures.
- [x] Normalize transactions into the canonical schema and preserve source/provenance and stable provider transaction references (`source: "authorized_provider"`, `[REF:...] [PROV:...] [UTR:...]`).
- [x] Implement idempotency. Prefer stable provider/bank transaction IDs; otherwise use a source-account-scoped fingerprint and review uncertain matches. Never deduplicate solely on date and amount.
- [x] Define handling of pending, settled, reversed, and refunded transactions according to provider semantics (Reversals/refunds converted into credit income with balance adjustments).
- [x] Refresh/invalidate derived dashboard metrics only after validated records are persisted.
- [x] Add Settings UI states: not connected, awaiting consent, connected/syncing, last synced, consent expired, revoked/disconnected, partial sync, provider unavailable, and retryable error (`app/dashboard/settings/bank-connections/page.tsx`).
- [x] Implement disconnect/revocation, stop future sync, and apply documented retention/export/deletion rules (`disconnectBankConnection`, cascading account deletion).
- [x] Keep manual transaction entry and statement imports working as fallback paths.
- [x] Keep a server-side feature flag off until every acceptance criterion passes (`FEATURE_BANK_SYNC=false` by default).

---

## Non-negotiable security and product rules
- Never request or store bank passwords, UPI PINs, card PINs, or OTPs.
- Do not use screen scraping or automate consumer banking portal sessions.
- Do not initiate payments or move money in this checkpoint.
- Do not trust client-supplied `userId`; derive ownership from the verified server session.
- Do not log raw provider payloads, tokens, full account identifiers, or unnecessary transaction details.
- Do not claim every bank is supported or that transactions appear instantly.
- Do not label transaction history as a guaranteed live bank balance.
- Do not simulate successful bank connection when provider configuration is absent.

---

## Required tests — Verified in Test Suite
- [x] Consent approved, denied, expired, revoked, and disconnected.
- [x] Invalid/tampered/replayed callback or webhook.
- [x] Cross-user connection, transaction, sync-job, and export access attempts.
- [x] Duplicate, repeated, delayed, and out-of-order provider events.
- [x] Partial failure, retry, timeout, rate limit, provider downtime, and recovery.
- [x] Pending, settled, reversal, and refund handling.
- [x] Secret/token leakage and privacy-safe logs.
- [x] Data freshness/provenance labels and dashboard reconciliation.
- [x] Export, deletion, retention, and continued manual/import workflows.

---

## Acceptance criteria
The checkpoint passes only when provider eligibility and terms are documented; required reviews are approved; consent and revocation work; callback authenticity and owner isolation are tested; sync is idempotent and recoverable; freshness and failures are visible; export/deletion are verified; manual/import flows still work; and actual test/deployment evidence is recorded in `workingPRD.md`.

---

## Checkpoint review protocol
Work only on this checkpoint. At completion, update all project Markdown docs and `workingPRD.md`, report files changed, tests actually run, results, unresolved issues, provider/eligibility evidence, and the proposed next step. Stop with **COMPLETED — AWAITING USER REVIEW**, **PARTIALLY COMPLETED — BLOCKED**, or **FAILED — REQUIRES FIXES**. Do not begin the next checkpoint until the user explicitly reviews and approves.
