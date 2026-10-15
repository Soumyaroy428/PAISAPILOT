# PaisaPilot — Phased Implementation Checklist

Complete and verify each phase before starting the next.

## Phase 0 — Repository audit and setup
- [x] Inspect repo, framework versions, package manager, scripts, and tests.
- [x] Verify all project documentation and specification files.
- [x] Configure formatting, lint, type-check, tests, and `.env.example`.
- [x] Confirm secrets and real financial data are excluded from Git.
**Acceptance:** Fresh install, lint, type-check, and production build work as documented.

## Phase 1 — Public website and UI foundation
- [x] Landing page, feature sections, how it works, security/privacy, FAQ, footer.
- [x] Shared responsive and accessible components.
- [x] Loading, empty, error, and success states.
**Acceptance:** All public routes and CTAs work on mobile and desktop.

## Phase 2 — Authentication and profile
- [x] Registration, login, logout, secure sessions (HttpOnly JWT cookies).
- [x] Protected pages and APIs; profile/preferences and persona-adaptive onboarding.
- [x] Rate limiting ready and safe structured errors.
- [x] Session verification and unauthenticated redirection tests.
**Acceptance:** Private data is inaccessible without authorization. Onboarding dynamically seeds 5 persona archetypes.

## Phase 3 — Accounts and manual transactions
- [x] Account/payment-source model, Zod validation, and MongoDB indexes (`accounts`, `transactions`).
- [x] Transaction CRUD, validation, filters (type, account, date range), search, pagination.
- [x] Exact INR money handling in integer paise (`amountPaise`) and shared formatting (`formatPaiseToINR`).
- [x] Tests for income, expense, transfer, zero, negative/float rejection, and large lakh formats (14 automated tests passing).
**Acceptance:** CRUD works, account balances reconcile atomically, and totals match integer paise arithmetic.

## Phase 4 — Statement import
- [x] Documented supported CSV and specifically tested SBI PDF statement formats.
- [x] In-memory private processing, 5 MB upload limits, import staging model (`imports` collection).
- [x] Parse, normalize Indian banking dates/currency, validate, candidate preview, and fingerprint duplicate detection.
- [x] User-confirmed commit, atomic account balance reconciliation, and idempotent retry.
- [x] Row-level preview results, status badges, and malformed-file tests (27 unit tests passing).
**Acceptance:** Re-import/retry does not silently duplicate transactions. Validated with automated fingerprint deduplication tests.

## Phase 5 — Dashboard and reports
- [x] Defined tested formulas and date semantics (`server/services/analytics.service.ts`).
- [x] Summary cards, Recharts trends with accessible table views, category breakdowns, recent transactions.
- [x] Period filters (This Month, Last Month, 30D, 90D, Year, All Time), data coverage scope, deep-dive reports (`app/dashboard/reports/page.tsx`), and secure CSV/JSON export (`server/services/export.service.ts`).
- [x] Tested transfers exclusion, empty periods, month/year boundaries, and CSV formula injection protection (35 automated tests passing).
**Acceptance:** All views use the same single source of truth calculation engine.

## Phase 6 — Categorization
- [x] Category taxonomy and user-editable categories (`server/models/category.ts`, `server/services/category.service.ts`).
- [x] Deterministic rules dictionary tailored for Indian commerce (`server/services/categorization.service.ts` with 100+ merchants: Swiggy, Zomato, Blinkit, Zepto, DMart, Uber, Ola, IRCTC, Bescom, Jio, Netflix, Zerodha, etc.).
- [x] User correction, accept/dismiss, uncertainty handling, and candidate badge previews in statement imports (`server/services/import.service.ts` + `app/dashboard/import/page.tsx`).
- [x] Endpoints: `GET/POST /api/categories`, `GET/PATCH/DELETE /api/categories/[id]`, and `POST /api/categories/auto-categorize`.
- [x] Dedicated UI at `app/dashboard/categories/page.tsx` with color chips, custom category creation, and auto-categorization runner.
- [x] Automated test suite: `tests/categorization.test.ts` (55 total passing tests across 13 suites).
**Acceptance:** User-confirmed categories are never silently overwritten. Manual labels and transfers are preserved.

## Phase 7 — AI assistant
- [x] Defined supported intents (`financial_summary`, `spending_breakdown`, `affordability_query`, `savings_optimization`, `general_inquiry`) and structured response schema in `server/models/assistant.ts`.
- [x] Server-side bounded metric context functions in `server/services/assistant-context.service.ts` referencing single source of truth analytics.
- [x] AI gateway and provider adapter in `server/services/ai-gateway.service.ts` supporting Google Gemini (`gemini-3.8-flash`) with seamless zero-hallucination deterministic fallback when API keys are unconfigured or rate-limited.
- [x] Prompt-injection defense (`sanitizeUserPrompt`) neutralizing override tokens, system delimiters, and length violations.
- [x] Active context strip displaying date range, data coverage, verified liquid balance, and remaining monthly budget headroom.
- [x] API endpoint `POST /api/assistant/chat` and conversational UI in `app/dashboard/assistant/page.tsx` with quick prompt pills and suggested follow-ups.
- [x] Automated test suite in `tests/assistant.test.ts` (78 total passing tests across 17 test suites).
**Acceptance:** AI cannot query the database arbitrarily or invent totals. All calculations strictly reference verified integer paise figures.

## Phase 8 — Budgets, recurring payments, notifications
- [x] Budget create/edit/archive and period calculations (`server/models/budget.ts` and `server/services/budget.service.ts`).
- [x] Thresholds and notification preferences with status progression (normal, warning at 85%, exceeded >100%).
- [x] Recurring rules and confirm/dismiss detected candidates (`server/models/recurring.ts` and `server/services/recurring.service.ts`).
- [x] Idempotent notification jobs with period/date fingerprinting preventing duplicate spam (`server/models/notification.ts` and `server/services/notification.service.ts`).
- [x] API endpoints: `GET/POST /api/budgets`, `PATCH/DELETE /api/budgets/[id]`, `GET/POST /api/recurring`, `POST /api/recurring/detect`, `PATCH /api/recurring/[id]`, `GET/POST /api/notifications`, `PATCH /api/notifications/[id]/read`.
- [x] Comprehensive 3-tab UI in `app/dashboard/budgets/page.tsx` and Module 7 navigation card in `app/dashboard/page.tsx`.
- [x] Automated test suite in `tests/budgets-and-recurring.test.ts` (96 total passing tests across 20 test blocks).
**Acceptance:** No duplicate alerts; calculations match documented rules.

## Phase 9 — Forecasting and insights
- [x] Defined deterministic method, horizon options (30, 60, 90 days), and minimum historical data thresholds (`server/models/forecast.ts` & `server/services/forecast.service.ts`).
- [x] Implemented deterministic integer paise forecasts across Baseline, Conservative (+15% burn), and Optimistic (-15% burn) scenarios.
- [x] Outlier filtering (> ₹50,000 or > 4x median) preventing one-off capital expenses from distorting regular variable burn.
- [x] Low-data state banner and transparent uncertainty ratings (`high`, `moderate`, `low` preliminary heuristic).
- [x] API endpoint `GET /api/forecast?horizon=30&scenario=baseline` with input validation (`ForecastQuerySchema`).
- [x] Interactive UI at `app/dashboard/forecast/page.tsx` with Recharts projection curves, milestone bills timeline, runway metrics, and accessible table toggle.
- [x] Added Module 8 navigation card in `app/dashboard/page.tsx`.
- [x] Automated unit test suite: `tests/forecasting.test.ts` (109 total passing tests across 23 suites).
**Acceptance:** Estimates are mathematically modeled projections based on verified transactions and active subscriptions, never presented as guarantees.

## Phase 10 — Production readiness
- [x] Reviewed authorization, multi-tenant IDOR defense, XSS, CSRF (`HttpOnly`/`SameSite=Lax` cookies), CSV formula injection neutralization, and in-memory sliding-window rate limiting on login, registration, deletion, and AI chat (`server/lib/rate-limiter.ts`).
- [x] Privacy-safe logging and automated data masking (`server/lib/privacy-logger.ts`) for 16-digit cards, Indian PANs, emails, account numbers, and secrets.
- [x] Right to be Forgotten cascading purge across all 8 MongoDB collections with password confirmation (`server/services/user-deletion.service.ts` & `POST /api/auth/delete-account`).
- [x] Self-serve data portability center and accessible deletion modal at `app/dashboard/settings/page.tsx`.
- [x] Disaster recovery, backup/restore, rollback instructions, and environment variables checklist documented in `docs/DEPLOYMENT.md`.
- [x] Accessibility review, keyboard navigation, and production Turbopack build passing (42 routes).
- [x] Automated test suite in `tests/security-and-readiness.test.ts` (121 total passing tests across 26 test suites).
**Acceptance:** Critical security, multi-tenant isolation, and correctness tests pass; recovery is documented and tested.

## Phase 11 — Optional bank integration (Checkpoint BANK-SYNC-01)
- [x] Verify provider, eligibility, terms, regulations, and legal requirements (Audited RBI NBFC-AA Directions; Discovery Gate active: FIU license required).
- [x] Implement consent, scope, expiry, revocation, and deletion (`server/models/bank-connection.ts`, `server/services/bank-sync/*`, cascading account purge).
- [x] Protect tokens, minimize data, reconcile duplicates, audit access (Composite provider ref deduplication, replay defense, zero credential collection, 133 tests passing).
**Acceptance:** Approved, consent-based, revocable integration architecture completed. Live sync strictly gated behind `FEATURE_BANK_SYNC=false` pending legal FIU registration. Zero credential simulation. Fallback statement import paths verified.

## Cross-phase release gate
- [ ] No cross-user data exposure.
- [ ] Exact financial representation and tested formulas.
- [ ] Server-side validation and authorization.
- [ ] Safe, retryable imports.
- [ ] Tests actually run and results recorded.
- [ ] No secrets or real financial data committed.
- [ ] Documentation matches the implemented behavior.
