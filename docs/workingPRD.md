# PaisaPilot — Working PRD (Living Baseline & Verification Record)

**Document type:** Living Project Status & Implementation Verification Record  
**Product:** PaisaPilot  
**Last Updated:** Checkpoint 0 — Initial Repository Audit  
**Status:** Baseline Audited; Implementation Not Started  

---

## 1. Project Overview & Current Architecture Baseline

- **Product Name:** PaisaPilot
- **Purpose:** AI-powered personal finance intelligence platform for India (INR, UPI, cards, cash, bank statements, budgets, grounded AI insights, cash-flow forecasting).
- **Core Principle:** Trustworthy financial calculations first, deterministic server-side money math (integer paise), zero raw database access for AI, bank statements treated as untrusted historical data, live bank integrations deferred until formal provider eligibility/compliance verification.
- **Intended Technology Stack:**
  - **Framework:** Next.js (App Router, React, TypeScript strict mode)
  - **Styling & UI:** Tailwind CSS, shadcn/ui primitives, Lucide icons, Recharts
  - **Backend API:** Next.js Route Handlers + modular domain services
  - **Database:** MongoDB Atlas (Mongoose or official MongoDB Node.js driver)
  - **Validation:** Zod (server-side runtime schemas for all inputs & environment variables)
  - **Authentication:** Established library with secure server-side sessions & HttpOnly cookies
  - **Storage:** Private object storage with TTL lifecycle cleanup for uploaded statements
  - **Background Worker:** Durable queue + Node.js worker for statement parsing & scheduled tasks
  - **AI Gateway:** Server-side LLM provider adapter with structured outputs and restricted tool allowlist
  - **Deployment Target:** Vercel (Next.js web app), Render (only if separate worker/persistent service is required)

---

## 2. Current Repository & Git Baseline

- **Repository Root:** `c:\Users\soumy\OneDrive\Desktop\PaisaPilot`
- **Git Status:** 
  - Isolated Git repository successfully initialized (`.git` present on branch `main`).
  - Strict `.gitignore` configured to exclude `.env*`, `node_modules/`, `.next/`, build artifacts, and statement uploads.
  - Remote configured: `origin -> https://github.com/Soumyaroy428/PAISAPILOT.git`.
  - Initial baseline commit: `2da685b` ("docs: initial repository audit baseline, project specifications, and architecture blueprint").
  - GitHub delivery: Successfully pushed to `origin/main` (`branch 'main' set up to track 'origin/main'`).
- **Node Environment:**
  - Node: `v22.21.0`
  - npm: `11.12.1`
  - Git: `2.51.2.windows.1`
- **Source Code Status:**
  - Project architecture structured at root level: `client/` (UI components, layouts, utils), `server/` (services, env validation), and `app/` (Next.js App Router routes). `src/` directory removed per user specification.
  - Checkpoint 1 public website foundation complete and verified.

---

## 3. Specification Documents Audit

All 10 required project documents have been identified, read, and verified:
1. `docs/ARCHITECTURE.md` — Verified present. Defines modular monolith layers, data flows, and trust boundaries.
2. `docs/DESIGN.md` — Verified present. Defines UI tokens, accessible components, public landing sections, and authenticated layouts.
3. `docs/MEMORY.md` — Verified present. Defines durable principles, non-negotiable financial rules, and open technical decisions.
4. `docs/prd.md` — Verified present. Complete product requirements, target personas, onboarding quiz, and phase checkpoints.
5. `docs/RULES.md` — Verified present. Security rules, integer paise policy, verification requirements, and AI sandboxing.
6. `docs/TASKS.md` — Verified present. Phased implementation checklists from Phase 0 to Phase 11.
7. `docs/PaisaPilot_Full_Application_Workflow.md` — Verified present. End-to-end user journeys, sitemap, public/authenticated screen maps.
8. `docs/trd.md` — Verified present. Full technical requirements, MongoDB schemas, API contracts, and parser specifications.
9. `docs/PaisaPilot_Backend_Handbook_Compliance_Audit.md` — Verified present. 20-concept backend audit checklist.
10. `docs/workingPRD.md` — Active document (updated with Checkpoint 0 baseline audit).

---

## 4. Feature Implementation & Verification Status

Status Key:
- `WORKING`: Verified with tests and functional evidence.
- `PARTIAL`: Code exists but incomplete or unverified.
- `BROKEN`: Verification demonstrates a defect.
- `NOT STARTED`: No code implemented yet.
- `UNVERIFIED`: Insufficient evidence.

| Module / Feature | Status | Notes / Baseline Evidence |
|---|---|---|
| Project Setup & Tooling (Next.js 16 Turbopack, TS, Tailwind, shadcn) | `WORKING` | Initialized, client/server folders organized, type-check & build passing. |
| Public Website (Landing, Features, How it Works, Security, FAQ, Footer) | `WORKING` | All 8 public routes created with responsive layouts and verified in production build. |
| Health Check API (`/api/health`) | `WORKING` | Implemented in `src/server/services/health.service.ts` & verified via HTTP curl returning 200 OK. |
| Authentication & Session Management (Register, Login, Logout, Cookies) | `WORKING` | Implemented in `server/lib/auth.ts`, `app/api/auth/*`, and UI in `app/login/page.tsx` & `app/register/page.tsx`. Secure HttpOnly session tokens with `jose` & bcrypt. |
| Persona-Adaptive Onboarding Quiz | `WORKING` | 4-step wizard in `app/onboarding/page.tsx` + `app/api/onboarding` supporting 5 archetypes (student, young_professional, freelancer, family, small_business) with auto-seeded presets and skip option. |
| Authenticated Dashboard Screen | `WORKING` | Private portal in `app/dashboard/page.tsx` with persona badge, integer paise KPI cards, and financial module navigation. |
| Accounts & Payment Sources (`accounts` collection, labels) | `WORKING` | Document model, indexes, `server/services/account.service.ts`, `app/api/accounts`, and UI in `app/dashboard/accounts/page.tsx` with liquidity totals and archive actions. |
| Manual Income & Expense Transactions (Paise math, CRUD, filters) | `WORKING` | Integer paise model, `server/services/transaction.service.ts`, `app/api/transactions`, atomic balance adjustments, and UI ledger in `app/dashboard/transactions/page.tsx`. |
| Statement Import Pipeline (CSV / SBI PDF, parsing, preview, commit) | `WORKING` | In-memory private parser, `server/lib/parsers/csv.parser.ts`, `server/lib/parsers/sbi-pdf.parser.ts`, duplicate fingerprinting, candidate staging, preview table UI in `app/dashboard/import/page.tsx`, and idempotent commit. |
| Financial Dashboard & Analytics (Totals, trends, categories, Recharts) | `WORKING` | Single source of truth calculation engine in `server/services/analytics.service.ts`, Recharts visualizer, accessible table toggle, category matrix, and deep-dive reports in `app/dashboard/reports/page.tsx`. |
| Transaction Categorization (Deterministic rules + AI fallback) | `WORKING` | Deterministic rule dictionary covering 100+ Indian merchants, default taxonomy auto-seeding, user customization, safe auto-categorization runner, and candidate preview badges. |
| Cash-Flow Forecasting & Insights | `WORKING` | Deterministic projection engine in `server/services/forecast.service.ts`, 30/60/90-day simulation across Baseline/Conservative/Optimistic scenarios, outlier filtering, low-data heuristic mode, endpoint `/api/forecast`, and interactive visualizer in `app/dashboard/forecast/page.tsx`. |
| Production Hardening & CI/CD | `WORKING` | In-memory sliding-window rate limiting (`server/lib/rate-limiter.ts`), privacy-safe logger with financial masking (`server/lib/privacy-logger.ts`), full cascading account purge (`server/services/user-deletion.service.ts` & `POST /api/auth/delete-account`), self-serve data portability center in `app/dashboard/settings/page.tsx`, and deployment guide in `docs/DEPLOYMENT.md`. |
| Authorized Bank Integration (Account Aggregator) | `PARTIALLY COMPLETED — BLOCKED` | Discovery Gate Active: RBI NBFC-AA FIU registration/contract required. Full software architecture, models, adapter, routes, settings UI, and 9/9 checkpoint unit/integration tests verified. Feature flag `FEATURE_BANK_SYNC=false` strictly off by default. Zero credentials stored; zero fake simulations. |

---

## 5. Verification & Tests Executed

- **Unit Test Suite (`npm test`):**
  - **133/133 automated unit tests passing across 28 suites (0 failures).**
  - Bank Sync Discovery Gate & Safety Adapter: verified strict disabled-by-default behavior (`FEATURE_BANK_SYNC=false`), zero-simulation defense in `DisabledBankSyncAdapter` preventing unverified connections, and regulatory notices citing RBI NBFC-AA Master Directions.
  - Full Consent Lifecycle Transitions: verified state progression (`pending_consent` -> `active` upon provider verification, `expired` upon past consent expiry, and `revoked` upon user disconnect).
  - CSRF, State Token Correlation & Replay Protection: verified rejection of forged or expired state tokens and complete prevention of replay attacks.
  - Multi-Tenant Cross-User Isolation Defense: verified cross-user callback hijacking, unauthorized sync triggers, and unauthorized disconnect attempts are strictly rejected.
  - Idempotent Transaction Deduplication: verified deduplication based on composite provider transaction reference (`[REF:...]`) scoped to account; verified two legitimate identical ₹50 payments on the same date are both preserved without false collision.
  - Reversals, Refunds & Provenance: verified reversed or refunded debit expenses convert to incoming credit income with provenance tags (`[STATUS:REFUNDED]`, `[REF:...]`, `[UTR:...]`) and reconcile account balances accurately.
  - Provider Downtime & Fault Recovery: verified graceful error handling (`lastSyncStatus: 'failed'`, redacted `lastErrorCode: 'SYNC_FETCH_ERROR'`) and recovery to `'success'` on retry.
  - Zod Boundaries & Redaction: verified validation for FIP IDs, duration (1-365 days), 32-character correlation tokens, and secret redaction.
  - Rate Limiting Defense: verified sliding-window quota enforcement, blocking on threshold breach, resetMs header, and explicit key resets on successful authentication.
  - Privacy-Safe Logging & Data Masking: verified automated masking of 16-digit credit cards, Indian PAN numbers, emails, bank accounts, and complete object redaction of passwords, tokens, API keys, and cookies.
  - Multi-Tenant Isolation & Account Deletion: verified complete multi-collection cascading purge across all 9 MongoDB collections (`transactions`, `accounts`, `categories`, `budgets`, `recurring`, `notifications`, `imports`, `bank_connections`, `users`) with zero cross-tenant contamination.
  - Cash-Flow Forecasting & Trajectory Simulation: verified `ForecastQuerySchema` (30/60/90-day horizons, string coercion, rejection of invalid horizons and scenarios), integer paise simulation across Baseline, Conservative (+15% burn, zero unconfirmed inflows), and Optimistic (-15% burn) scenarios.
  - Cash Runway & Outlier Defenses: verified runway calculations (sustainable null when inflows >= burn, exact integer days during net burn, zero runway on depleted balance), and verified outlier filtering preventing one-off capital purchases (> ₹50,000) from inflating the daily variable burn rate.
  - Lowest Projected Balance Point: verified tracking of mid-month cash crunch dips and recovery following salary credits.
  - Budget Validation & Progress Logic: verified `CreateBudgetSchema` (positive INR amount, default 85% threshold, 50-100% threshold boundaries), `UpdateBudgetSchema` partial updates, and integer paise utilization with status transitions (`normal`, `warning` at 85%, `exceeded` >100% with clamped 0 remaining).
  - Recurring Payments & Subscriptions: verified `CreateRecurringSchema` (frequencies: monthly, quarterly, yearly, weekly; ISO YYYY-MM-DD date validation), status transitions (`candidate`, `active`, `paused`, `dismissed`), and next expected due date projection into the future.
  - Recurring Merchant Detection Heuristics: verified identification of common Indian subscriptions (Netflix, Spotify, Bescom, Zerodha SIP, Rent).
  - Idempotent Notification Fingerprinting: verified deterministic SHA/composite period keys (`budget_${userId}_${catName}_${YYYY_MM}_warning` / `exceeded` and `recurring_${userId}_${ruleId}_${dueDate}`) preventing duplicate alert spam across cycles.
  - AI Prompt Sanitization & Injection Defense: verified stripping of prompt override phrases (`ignore previous instructions`, `system prompt`), HTML/XML tags, and 800-char truncation boundary.
  - Intent Detection: verified classification across 5 supported intents (`affordability_query`, `spending_breakdown`, `savings_optimization`, `financial_summary`, `general_inquiry`).
  - Rupee Monetary Extraction: verified exact parsing of `₹15,000`, `Rs 2,500`, `1.5 lakh`, `25k`, and raw amounts.
  - Grounded Deterministic Engine: verified exact integer paise arithmetic for financial summaries, comfortable vs budget-exceeding vs liquidity-exceeding affordability evaluations.
  - System Prompt Grounding: verified strict system instructions bounding the LLM to verified financial numbers with zero hallucination.
  - Deterministic Indian Merchant Categorization: verified exact categorization across all 11 Indian categories (Swiggy, Blinkit, Uber, IRCTC, Bescom, Amazon, Zerodha, Netflix, Apollo, Salary, Transfers).
  - Categorization Fallback & Safety: verified graceful fallback to `Uncategorized` for unknown strings/empty inputs, and verified user-confirmed categories are never overwritten.
  - Category Zod Schemas: verified hex color code validation, minimum/maximum lengths, and partial updates.
  - Exact integer paise formatting: standard amounts, zero, negative/deficit formatting, Indian lakhs grouping.
  - Floating-point drift prevention: verified exact addition/subtraction in paise.
  - Transaction Zod schema boundaries: verified rejection of non-integer floats, zero, negative amounts, and oversized strings.
  - Account Zod validation: verified supported types, rejection of unsupported types, default initial balance of 0 paise.
  - Query parameter validation: verified pagination defaults and safe string-to-integer coercions.
  - Bank Date Normalization: verified parsing of `DD/MM/YYYY`, `DD-MM-YYYY`, `DD Mon YYYY` (SBI format), and ISO format.
  - Indian Currency-to-Paise: verified parsing of decimal amounts, Indian lakhs grouping, rupee symbols, and Dr/Cr notations.
  - CSV Statement Parser: verified multi-column Debit/Credit parsing, quoted text with commas, and malformed line error detection.
  - Deduplication & Fingerprint Stability: verified deterministic SHA-256 content hashing and time-invariant transaction fingerprinting.
  - Period Date Boundary Resolution: verified day-1 00:00:00 to last-day 23:59:59 calculations across months, years, and rolling periods.
  - Single Source of Truth Financial Calculation: verified internal transfers exclusion from P&L, savings rate calculation with zero-income and deficit defense.
  - CSV Formula Injection Defense: verified neutralization of dangerous spreadsheet formula prefixes (`=`, `+`, `-`, `@`) and RFC quoting.
- **Lint / Type Check:** `npm run type-check` (`tsc --noEmit`) -> **PASS (0 errors across all routes, services, charts, models, and parsers)**.
- **Production Build:** `npm run build` (`next build` with Turbopack) -> **PASS (48 routes compiled successfully, including 31 dynamic API routes and 17 static/prerendered pages)**.
- **Bank Synchronization Endpoints:**
  - `GET /api/bank-sync/status` -> Returns current feature flag status, regulatory notices, and active connection details.
  - `POST /api/bank-sync/connect` -> Enforces Discovery Gate flag, generates cryptographic correlation token, and initiates consent request.
  - `GET/POST /api/bank-sync/callback` -> Handles provider redirect callback with CSRF/replay defense and multi-tenant user verification.
  - `POST /api/bank-sync/sync` -> Executes idempotent transaction sync with composite provider reference deduplication.
  - `POST /api/bank-sync/disconnect` -> Revokes provider consent and marks connection revoked locally.
- **Security & Account Deletion Endpoints:**
  - `POST /api/auth/delete-account` -> Cascades permanent deletion across all 9 user collections with password verification and sliding-window rate limiting.
- **Cash-Flow Forecasting Endpoints:**
  - `GET /api/forecast` -> Returns deterministic 30/60/90-day cash flow projections, runway days, lowest cash point, and scenario comparison.
- **Budgets, Recurring & Notification Endpoints:**
  - `GET/POST /api/budgets` -> Aggregates active budgets with real-time monthly spending progress or creates custom category budget.
  - `PATCH/DELETE /api/budgets/[id]` -> Partial updates and safe soft-delete archiving of budgets.
  - `GET/POST /api/recurring` -> Retrieves active recurring rules and upcoming bills timeline or creates manual subscription.
  - `POST /api/recurring/detect` -> Scans last 120 days of transactions to stage new subscription candidates without overwriting.
  - `PATCH /api/recurring/[id]` -> Confirms, pauses, or dismisses subscription candidates.
  - `GET/POST /api/notifications` -> Returns notification feed or triggers idempotent alert generation scan.
  - `PATCH /api/notifications/[id]/read` -> Marks single notification or all user notifications as read.
- **AI Assistant Endpoints:**
  - `POST /api/assistant/chat` -> Secure grounded AI conversational endpoint with prompt sanitization, intent classification, bounded facts injection, rate limiting, and Gemini / deterministic fallback execution.
- **Categories & Intelligence Endpoints:**
  - `GET /api/categories` -> Returns active categories for authenticated user with auto-seeded Indian defaults.
  - `POST /api/categories` -> Creates custom category with hex color and normalized uniqueness enforcement.
  - `GET/PATCH/DELETE /api/categories/[id]` -> Individual category retrieval, modifications, and safe soft-delete archiving.
  - `POST /api/categories/auto-categorize` -> Evaluates unassigned transactions with deterministic rules, returning summary breakdown while strictly preserving manual labels.
- **Analytics & Export Endpoints:**
  - `GET /api/analytics/dashboard` -> Aggregates real-time P&L metrics, category distributions, Recharts trend points, and data coverage scope.
  - `GET /api/analytics/export` -> Secure stream download of sanitized CSV and clean JSON transaction exports with date-range filters.
- **Interactive UI Ledgers & Analytics:**
  - `app/dashboard/settings/bank-connections/page.tsx` -> Dedicated Bank Connections & Auto-Sync portal with Discovery Gate regulatory notice, Account Aggregator consent configuration modal, active connection status card, and zero-credential fallback workflow links (PhonePe/PDF import & manual ledger).
  - `app/dashboard/settings/page.tsx` -> Security & Data Privacy portal with verified identity details, Bank Connections navigation card, 1-click JSON/CSV self-serve data portability, and password-confirmed Right to be Forgotten account purge.
  - `app/dashboard/forecast/page.tsx` -> Cash-Flow Forecasting & Runway portal with 30/60/90-day horizon selector, Baseline/Conservative/Optimistic scenarios, Recharts line charts, milestone commitments timeline, and accessible table toggle.
  - `app/dashboard/budgets/page.tsx` -> 3-tab financial controls center: Monthly Budgets (progress bars, status badges, modal), Recurring Subscriptions & Bills (upcoming bills timeline, detected candidates review, rules table), and Idempotent Notifications feed with mark-as-read actions.
  - `app/dashboard/page.tsx` -> Recharts Cash Flow Inflows vs Outflows visualization, accessible tabular view toggle, budget threshold alert bar, Module 7 & 8 navigation cards, Settings button, and data coverage notice.
  - `app/dashboard/assistant/page.tsx` -> PaisaPilot Copilot portal with verified facts strip, quick prompt pills, markdown thread, suggested follow-ups, and copy actions.
  - `app/dashboard/categories/page.tsx` -> Interactive category taxonomy manager, color chips, custom category modal, and one-click auto-categorization runner.
  - `app/dashboard/reports/page.tsx` -> Full P&L breakdown, category expenditure matrix (count, total, average ticket size, % share), and self-serve export center.
  - `app/dashboard/import/page.tsx` -> Statement import preview table showing auto-detected category badges next to staged candidate rows.
- **Health Check Smoke Test:** `/api/health` -> **PASS (HTTP 200 OK)**.

---

## 6. Critical Risks & Guardrails Identified

1. **Git Isolation Risk:** Root repository was picking up `C:/Users/soumy`. Must execute `git init` directly inside `c:\Users\soumy\OneDrive\Desktop\PaisaPilot` in Checkpoint 1 with an airtight `.gitignore`.
2. **Financial Arithmetic Risk:** Authoritative money balances must never use binary floating-point numbers (`0.1 + 0.2 !== 0.3`). Must strictly use integer paise (`amountPaise: number`) across database, services, and API boundaries.
3. **Multi-Tenant Isolation (IDOR) Risk:** Every database query and mutation must enforce `{ _id: recordId, userId: authenticatedUserId }`. Client-provided `userId` in payloads must never be trusted.
4. **Statement File Security Risk:** User-uploaded bank statements may contain sensitive information and malformed structures. Must enforce server-side MIME and content validation, private storage with TTL lifecycle cleanup, memory limits, and preview-before-commit workflows.
5. **AI Hallucination & Injection Risk:** LLMs must never be given direct MongoDB access or raw SQL/NoSQL query execution privileges. Untrusted transaction descriptions must be sanitized to prevent prompt injection. All financial figures must come from deterministic backend calculators.
6. **No Fake Live Bank Integrations:** Stored statement balances must never be presented as "Live balances". Live Account Aggregator connections require verified regulatory eligibility.

---

## 7. Deployment Readiness & Blockers

- **Vercel Readiness:** `CONDITIONALLY READY` (Local Next.js production build passes with 0 errors. Awaiting MongoDB credentials and Auth secrets for full deployment).
- **Render Readiness:** `NOT REQUIRED FOR MVP` (Background jobs can run in serverless/route tasks initially).
- **Blockers for Checkpoint 2:**
  1. MongoDB Atlas connection string (placeholder configured in `.env.example`).
  2. Authentication provider selection and session secret.

---

## 8. Next Recommended Checkpoint

- **Checkpoint 2 — Authentication and Onboarding:**
  - Setup MongoDB connection handling (singleton client for serverless environments).
  - Implement User schema & data access layer (`users` collection).
  - Implement secure server-side session authentication (registration, login, logout, password recovery).
  - Build post-registration persona-adaptive onboarding quiz ("one-by-one" card flow):
    - Persona selection: Student, Professional, Freelancer, Family, Small Business.
    - Dynamic branching questions (inflow, commitments, payment habits).
    - Auto-seeding default categories and baseline budgets.
  - Implement `/api/onboarding` endpoints and gatekeeper session protection.
  - Run auth unit/integration tests and type checking.

