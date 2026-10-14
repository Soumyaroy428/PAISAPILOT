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
- [ ] Document supported CSV and specifically tested PDF formats.
- [ ] Private storage, upload limits, import status/job model.
- [ ] Parse, normalize, validate, preview, and duplicate detection.
- [ ] User-confirmed commit and idempotent retry.
- [ ] Row-level results, retention/deletion, malformed-file tests.
**Acceptance:** Re-import/retry does not silently duplicate transactions.

## Phase 5 — Dashboard and reports
- [ ] Define tested formulas and date semantics.
- [ ] Summary cards, trends, categories, recent transactions.
- [ ] Period filters, data coverage, reports, secure export.
- [ ] Test refunds, transfers, empty periods, month/year boundaries.
**Acceptance:** All views use the same calculation source.

## Phase 6 — Categorization
- [ ] Category taxonomy and user-editable categories.
- [ ] Deterministic rules and optional AI suggestions.
- [ ] User correction, accept/dismiss, uncertainty handling.
**Acceptance:** User-confirmed categories are not silently overwritten.

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
