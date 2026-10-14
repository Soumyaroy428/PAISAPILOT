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
- [ ] Define supported intents and response schema.
- [ ] Server-side bounded metric/context functions.
- [ ] AI gateway, provider adapter, timeouts, limits, error handling.
- [ ] Prompt-injection defense and output validation.
- [ ] Display date range, coverage, assumptions, and supporting links.
**Acceptance:** AI cannot query the database arbitrarily or invent totals.

## Phase 8 — Budgets, recurring payments, notifications
- [ ] Budget create/edit/archive and period calculations.
- [ ] Thresholds and notification preferences.
- [ ] Recurring rules and confirm/dismiss detected candidates.
- [ ] Idempotent notification jobs; test time zones.
**Acceptance:** No duplicate alerts; calculations match documented rules.

## Phase 9 — Forecasting and insights
- [ ] Define method and minimum historical data.
- [ ] Implement deterministic forecasts with assumptions.
- [ ] Low-data state, uncertainty labels, outlier tests.
**Acceptance:** Estimates are not presented as guarantees.

## Phase 10 — Production readiness
- [ ] Review authorization, IDOR, XSS, CSRF, injection, uploads, and rate limits.
- [ ] Dependency/secret scans; privacy-safe logging.
- [ ] End-to-end export and deletion tests.
- [ ] Monitoring, backups, tested restore, deployment/rollback docs.
- [ ] Accessibility review and production build.
**Acceptance:** Critical security and correctness tests pass; recovery is documented and tested.

## Phase 11 — Optional bank integration
- [ ] Verify provider, eligibility, terms, regulations, and legal requirements.
- [ ] Implement consent, scope, expiry, revocation, and deletion.
- [ ] Protect tokens, minimize data, reconcile duplicates, audit access.
**Acceptance:** Approved, consent-based, revocable integration. Do not assume direct SBI API access.

## Cross-phase release gate
- [ ] No cross-user data exposure.
- [ ] Exact financial representation and tested formulas.
- [ ] Server-side validation and authorization.
- [ ] Safe, retryable imports.
- [ ] Tests actually run and results recorded.
- [ ] No secrets or real financial data committed.
- [ ] Documentation matches the implemented behavior.
