# PaisaPilot — Development Checkpoint PRD

**Product:** PaisaPilot  
**Document:** `prd.md`  
**Purpose:** Product requirements and phase-by-phase checkpoints for manual and AI-assisted development  
**Platform:** Responsive web application  
**Initial market:** India  
**Initial bank statement target:** State Bank of India (SBI), using user-provided files  
**Status:** Development blueprint; provider integrations and regulatory eligibility must be verified before production use

---

## 1. Product Overview

### 1.1 Vision

PaisaPilot is an AI-powered personal finance intelligence platform that helps users understand where their money goes, identify spending patterns, manage budgets, and plan for upcoming expenses.

The first version uses manual transaction entry and user-uploaded bank statements. AI capabilities are added gradually after transaction processing and financial calculations are reliable.

### 1.2 Problem

Financial information can be scattered across bank accounts, UPI apps, cards, cash expenses, and subscriptions. Users may struggle to see a unified view, categorize transactions, notice recurring charges, compare spending across months, and make informed budgeting decisions.

### 1.3 Product objectives

- Consolidate imported and manually entered transactions.
- Reduce manual categorization work.
- Provide accurate spending summaries and reports.
- Help users manage budgets and identify recurring payments.
- Explain financial patterns with grounded AI insights.
- Add transparent cash-flow forecasts after the core data pipeline is reliable.
- Protect sensitive financial information.
- Leave room for future authorized bank-data integration.

### 1.4 Target users

- **College students:** Managing a limited monthly allowance or internship stipend, tracking hostel/mess/study costs, avoiding overspending on outings.
- **Young professionals:** Managing regular monthly salary, rent, loan EMIs, bills, lifestyle spending, and savings/investment goals.
- **Freelancers:** Managing irregular income inflows across multiple clients, maintaining cash buffers, and tracking project-related costs.
- **Families / Households:** Reviewing pooled household income, groceries, education fees, utilities, medical expenses, and collective savings.
- **Small-business owners / Micro-entrepreneurs:** Keeping personal and business expenses strictly separate, monitoring operating cash buffers, and tracking vendor cycles.

*Note: Immediately upon registration, PaisaPilot presents a dynamic, step-by-step ("one-by-one") onboarding quiz tailored to these target user personas to gather essential baseline financial data and initialize customized categories and budgets.*

### 1.5 Product boundaries

The initial product is a personal finance management and insight tool. It does not initiate payments, move money, guarantee forecasts, provide regulated investment advice, or claim live bank connectivity without a verified provider integration.

---

## 2. Technology Stack

### Required stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS.
- **UI:** shadcn/ui, Lucide icons, Recharts.
- **Backend:** Next.js Route Handlers with modular service layers.
- **Database:** MongoDB Atlas using Mongoose or the official MongoDB Node.js driver.
- **Validation:** Zod or an equivalent runtime validation library.
- **Authentication:** An established authentication library/provider with secure session management.
- **AI:** An LLM API using structured outputs and restricted backend tools.
- **Testing:** Vitest, React Testing Library, and Playwright.
- **Monitoring:** Error tracking and structured application logs.
- **Deployment:** Vercel or equivalent for the web application; managed infrastructure for background workers and MongoDB.

### Recommended supporting infrastructure

- Private object storage for temporary statement files, with lifecycle deletion.
- A durable queue and Node.js worker for longer-running imports, AI categorization, and scheduled alerts.
- GitHub Actions or an equivalent CI pipeline.
- Managed email delivery for verification and notifications.
- Rate limiting suitable for the selected hosting environment.

### Architecture decision

Start with Next.js Route Handlers and a separate background worker. Use Route Handlers for authenticated CRUD operations, analytics, budgets, and AI chat. Use workers for statement parsing, bulk processing, recurring-payment analysis, and scheduled jobs.

Introduce a separate Express API only when independent scaling, additional clients, or team needs justify the extra operational complexity.

---

## 3. Development Workflow for Humans and AI Coding Tools

Every phase must follow this workflow:

1. Inspect the existing repository before changing files.
2. Compare current implementation against this PRD.
3. List missing features, defects, risks, and dependencies.
4. Propose a concise implementation plan.
5. Make the smallest safe set of changes.
6. Run relevant tests, type checks, and linting.
7. Review authorization, calculation accuracy, and failure handling.
8. Fix confirmed regressions.
9. Report files changed, tests run, results, and unresolved issues.
10. Mark a checkpoint complete only after its acceptance criteria pass.

### Mandatory implementation rules

- Preserve working functionality and existing conventions.
- Do not rewrite the project from scratch unless explicitly requested.
- Implement one phase at a time.
- Do not mark code complete merely because it was generated.
- Never expose secrets, credentials, or private financial records to the browser.
- Enforce authorization and user-level data isolation on every protected operation.
- Use synthetic data for development and testing.
- Do not fake a live bank integration.
- Do not request or store bank passwords, UPI PINs, or OTPs.
- Report missing credentials, unsupported statement formats, external dependencies, and unresolved compliance questions.
- Avoid unrelated refactoring or dependency upgrades.

---

## 4. Phase 1 — Project Setup

### Requirements

- [ ] Create or inspect a Next.js App Router project with TypeScript and Tailwind CSS.
- [ ] Configure MongoDB Atlas connection through server-only environment variables.
- [ ] Add a validated `.env.example` containing placeholders, never real secrets.
- [ ] Configure reusable UI components and project conventions.
- [ ] Set up linting, formatting, and type checking.
- [ ] Establish Git version control and a repeatable local setup.
- [ ] Add a basic health check or safe database connectivity check.

### Acceptance criteria

- The application starts locally using documented commands.
- The database connection succeeds when valid credentials are configured.
- Missing or invalid configuration produces a safe, understandable error.
- No secret is committed to source control or exposed to client bundles.
- Linting and TypeScript checks pass.

---

## 5. Phase 2 — Authentication and Security Foundation

### Requirements

- [ ] Implement registration, login, logout, and password reset.
- [ ] Implement email verification where appropriate.
- [ ] Use secure sessions and appropriate cookie settings.
- [ ] Protect dashboard routes and API endpoints.
- [ ] Scope every private database query to the authenticated user.
- [ ] Validate request bodies, query parameters, and route parameters.
- [ ] Add rate limiting to sensitive endpoints.
- [ ] Configure CSRF protection where applicable to the authentication design.
- [ ] Implement safe error responses without stack traces or sensitive data.
- [ ] Add account data export and deletion workflows or clearly document them as pending.
- [ ] **Persona-Adaptive Post-Registration Onboarding Quiz ("One-by-One" Step-by-Step Flow):**
  - **Step 1 — Target User Persona Selection:** First screen asks the user: *"Which profile best describes your financial journey?"*
    1. *College Student* (allowance, pocket money, campus life, mess/canteen, tight budget)
    2. *Young Professional* (monthly salary, rent, EMIs, lifestyle, savings & investments)
    3. *Freelancer / Independent* (irregular income, variable cash flow, multiple clients, tax/dry-spell buffers)
    4. *Family / Household* (pooled income, groceries, education fees, household utilities, emergency reserves)
    5. *Small-Business Owner* (business cash flow, personal vs. business expense segregation, vendor cycles)
  - **Dynamic Branching Questions (Presented One-by-One with Progress Bar):**
    - **If College Student:**
      - Inflow source & range: Monthly allowance / stipend / part-time wages (in INR).
      - Recurring campus expenses: Mess/Food, Rent/Hostel, Books/Courses, Subscriptions, Outings.
      - Financial target: Monthly spending cap and pocket-savings target.
      - Primary payment methods: UPI (GPay, PhonePe, Paytm), Student debit card, Cash.
    - **If Young Professional:**
      - Inflow: Take-home monthly salary range & typical credit date (e.g., 1st or last working day).
      - Fixed monthly obligations: House rent, loan EMIs (Education/Car/Home), utility bills, health insurance.
      - Savings/investment target: Planned monthly savings percentage (e.g., 20% savings/SIP).
      - Priority lifestyle categories: Food delivery (Swiggy/Zomato), Commute/Cab, Shopping, Entertainment.
      - Primary bank/cards: Primary bank (e.g. SBI) and credit cards in use.
    - **If Freelancer:**
      - Inflow pattern: Irregular per-project payouts, retainers, or milestone-based.
      - Baseline income estimate & minimum monthly survival expense threshold.
      - Buffer strategy: Tax withholding reserve and emergency dry-spell fund goal.
      - Primary client payment rails: Bank transfers (IMPS/NEFT), UPI, international platforms.
      - Work-related deductions: Tools/software, workspace/internet, hardware.
    - **If Family / Household:**
      - Household income structure: Single vs. dual earner combined income bracket.
      - Core household outflows: Groceries & provisions, school/tuition fees, domestic utilities, medical expenses.
      - Collective monthly household budget cap.
      - Family savings priorities: Emergency corpus, festive/vacation fund, children's future.
    - **If Small-Business Owner:**
      - Business nature: Retail, services, agency, or trading.
      - Average monthly revenue/turnover band.
      - Expense segregation requirement: Track owner drawings vs. operational costs.
      - Working capital & vendor payment intervals.
  - **Universal Final Step — Preferences & System Initialization:**
    - Default currency (INR `₹`) and timezone (`Asia/Kolkata`).
    - Primary tracking preference: Bank statement upload (SBI PDF/CSV), manual entry, or hybrid.
    - Automatically seed recommended default expense categories and initial baseline budgets based on quiz answers.
    - UX requirements: Distraction-free card layout, one question at a time, animated transitions, clear progress indicator, "Back" navigation, and a "Skip for now (Complete in Settings)" escape hatch.
  - **Data Persistence:** Store user responses in `users.onboardingProfile` and set `users.onboardingCompleted = true`.

### Acceptance criteria

- Unauthenticated users cannot access private financial data.
- User A cannot read, update, or delete User B's records, even by changing an identifier.
- Newly registered users are redirected immediately to the step-by-step onboarding quiz before entering the dashboard.
- The onboarding quiz dynamically adjusts questions based on the selected persona (Student, Professional, Freelancer, Family, Business).
- Completing or skipping the quiz updates the user's profile and seeds relevant initial categories and budget baselines without crashing.
- Users can review or re-take the onboarding questionnaire anytime in Account Settings.
- Password reset tokens expire and cannot be reused.
- Secrets and session tokens are not logged.
- Security-sensitive operations create suitable audit events.

---

## 6. Phase 3 — Manual Finance Management

### Requirements

- [ ] Add income transactions.
- [ ] Add expense transactions.
- [ ] Edit and delete transactions with suitable confirmation.
- [ ] Support transaction date, description, amount, currency, category, and payment source.
- [ ] Support user-defined categories where practical.
- [ ] Implement search, filters, sorting, and pagination.
- [ ] Allow users to create, edit, and delete weekly or monthly budgets.
- [ ] Calculate income, expenses, and net cash flow accurately.
- [ ] Add useful empty, loading, validation, and error states.

### Financial data rules

- Store INR values as integer paise where practical, or use an exact decimal representation.
- Use one documented convention for amount and debit/credit direction.
- Use a consistent date and timezone policy.
- Never rely on floating-point arithmetic for financial totals.
- Keep calculation logic in tested server-side functions.

### Acceptance criteria

- CRUD operations work only on records owned by the authenticated user.
- Totals match independently calculated test fixtures.
- Invalid dates, amounts, and categories are rejected.
- Deletion and editing update summaries correctly.

---

## 7. Phase 4 — SBI Statement Import

### Supported inputs

- CSV statements.
- Specifically tested SBI PDF statement formats.
- Manual transaction entry as a fallback.
- Synthetic demo data for development.

Do not assume every SBI statement layout is identical. Implement format-specific parsers and document supported statement types.

### Requirements

- [ ] Validate file type, size, content, and ownership server-side.
- [ ] Use private temporary storage for uploaded statements.
- [ ] Parse dates, descriptions, debit, credit, balance, and transaction references when present.
- [ ] Normalize records into a common transaction schema.
- [ ] Show an import preview before committing records.
- [ ] Allow users to correct or map unrecognized columns.
- [ ] Report malformed and rejected rows.
- [ ] Track import status, counts, and failures.
- [ ] Detect duplicate imports and duplicate transactions.
- [ ] Make import processing idempotent so retries do not create duplicates.
- [ ] Delete temporary files according to the retention policy.
- [ ] Provide an import history and a documented recovery/removal process.

### Deduplication rules

Prefer stable bank transaction reference identifiers when available. Otherwise, use a carefully designed source-account-scoped fingerprint and a review policy for uncertain matches. Do not deduplicate solely on date and amount, because legitimate transactions can share those values.

### Acceptance criteria

- Supported files are parsed correctly against a manually verified sample.
- Unsupported formats fail safely with a clear message.
- The user can inspect rows before saving.
- Repeated uploads do not create unintended duplicate transactions.
- Opening and closing balances, when present, are not confused with transaction amounts.
- Failed imports can be retried without corrupting data.

---

## 8. Phase 5 — Dashboard and Reports

### Requirements

- [ ] Show total income for a selected period.
- [ ] Show total expenses for a selected period.
- [ ] Show net cash flow.
- [ ] Show category-level spending.
- [ ] Show monthly spending trends.
- [ ] Show recent transactions.
- [ ] Support this month, previous month, last 90 days, and custom ranges.
- [ ] Compare equivalent time periods.
- [ ] Allow charts to drill down into underlying transactions.
- [ ] Display budgets and recurring-payment summaries when available.
- [ ] Clearly show the coverage period and source of imported data.
- [ ] Distinguish transaction summaries from live bank balances.

### Acceptance criteria

- Chart values and totals match backend calculations.
- Date filters apply consistently to charts, totals, and transaction lists.
- Empty and partial data are clearly explained.
- The interface works on desktop and mobile browsers.

---

## 9. Phase 6 — AI Expense Categorization

### Requirements

- [ ] Create an allowed category and subcategory schema.
- [ ] Apply deterministic merchant rules before calling an AI model.
- [ ] Use an AI classifier only for ambiguous descriptions.
- [ ] Require structured output and validate it server-side.
- [ ] Track classification source, confidence/review status, and corrections.
- [ ] Allow users to correct categories and recategorize transactions.
- [ ] Keep low-confidence predictions reviewable.
- [ ] Build a manually verified evaluation dataset.
- [ ] Track categorization accuracy and common error cases.
- [ ] Handle AI outages and rate limits without blocking manual finance features.

### Acceptance criteria

- AI output cannot introduce arbitrary categories or change transaction amounts.
- Users can correct incorrect categories.
- AI failure does not prevent transaction viewing or manual categorization.
- Sensitive information sent to the AI provider is minimized.

---

## 10. Phase 7 — AI Financial Assistant

### Supported questions

- “How much did I spend on food last month?”
- “Why are my expenses higher than the previous month?”
- “Show my top five spending categories.”
- “Which recurring payments should I review?”
- “How much remains in my budget?”
- “What happens if I spend another ₹2,000 this week?”

### Backend tools

Provide narrowly scoped functions such as:

- `getSpendingSummary(period)`
- `getSpendingByCategory(period, category)`
- `comparePeriods(periodA, periodB)`
- `getBudgetStatus()`
- `getRecurringPayments()`
- `simulateCashFlow(scenario)`

### Security and reliability requirements

- [ ] Authenticate and authorize every tool invocation.
- [ ] Restrict every query to the current user's permitted records.
- [ ] Validate date ranges, category identifiers, and scenario inputs.
- [ ] Calculate all financial values in trusted backend code.
- [ ] Prevent arbitrary AI-generated MongoDB queries.
- [ ] Treat imported descriptions and documents as untrusted content.
- [ ] Test defenses against prompt injection.
- [ ] Do not allow transfers, payment initiation, or other financial actions.
- [ ] Show supporting numbers, period, assumptions, and limitations.
- [ ] Handle timeouts, invalid output, rate limits, and provider outages.
- [ ] Apply retention controls to conversation history.

### Acceptance criteria

AI answers match verified backend results, distinguish facts from estimates, and never reveal another user's information.

---

## 11. Phase 8 — Budgets, Recurring Payments, and Alerts

### Requirements

- [ ] Support weekly and monthly category budgets.
- [ ] Show budget usage and remaining amounts.
- [ ] Support configurable alert thresholds.
- [ ] Detect candidate recurring payments from merchant similarity, amounts, and intervals.
- [ ] Distinguish detected candidates from user-confirmed recurring charges.
- [ ] Alert users about approaching budget limits.
- [ ] Identify unusual spending changes and possible duplicates.
- [ ] Notify users about upcoming confirmed or likely recurring charges.
- [ ] Provide notification preferences.
- [ ] Prevent duplicate or excessive notifications.

### Acceptance criteria

Budget calculations are accurate, alerts are configurable, and recurring-payment detection does not present uncertain matches as confirmed subscriptions.

---

## 12. Phase 9 — Cash-Flow Forecasting

### Requirements

- [ ] Use historical transactions and confirmed upcoming bills.
- [ ] Allow users to enter expected income and its expected date.
- [ ] Build deterministic baseline projections first.
- [ ] Support scenarios such as delayed income or unexpected expenses.
- [ ] Display projected cash flow and potential shortfall dates.
- [ ] Show assumptions, source data coverage, and uncertainty.
- [ ] Evaluate forecast performance where historical data permits.
- [ ] Avoid guarantees about future balances or income.
- [ ] Keep forecasts separate from verified historical transactions.

### Acceptance criteria

Users can distinguish historical facts, user assumptions, and projected values. Forecasts must not be described as guaranteed bank balances.

---

## 13. Phase 10 — Production Readiness

### Testing

- [ ] Unit-test financial calculations and date boundaries.
- [ ] Test import parsing using verified sample statements.
- [ ] Test duplicate detection and retry behavior.
- [ ] Test API validation and authorization.
- [ ] Test cross-user data isolation.
- [ ] Test AI tools, invalid outputs, and prompt-injection scenarios.
- [ ] Run end-to-end tests for core workflows.
- [ ] Run linting, type checks, and dependency vulnerability checks.

### Operational readiness

- [ ] Configure error monitoring and structured logs.
- [ ] Avoid logging sensitive transaction content, credentials, or tokens.
- [ ] Configure database backups and test recovery.
- [ ] Configure secure environment variables.
- [ ] Test deployment and database connectivity.
- [ ] Review upload security and data-retention rules.
- [ ] Test account export and deletion.
- [ ] Check accessibility and responsive layouts.
- [ ] Document setup, deployment, known limitations, and incident response.

### Acceptance criteria

The application has passed functional, security, and regression tests; deployment is reproducible; and known limitations are documented.

---

## 14. Phase 11 — Future Authorized Bank Integration

This phase is optional and must not block the manual-import MVP.

### Requirements

- [ ] Investigate eligibility for an authorized Account Aggregator or other suitable provider integration.
- [ ] Verify SBI coverage, provider terms, commercial requirements, and permitted use.
- [ ] Implement explicit customer consent and purpose limitation.
- [ ] Securely handle provider callbacks and synchronization status.
- [ ] Implement consent revocation and disconnect flows.
- [ ] Reconcile synchronized data with uploaded statements.
- [ ] Prevent duplicate transactions across data sources.
- [ ] Document data retention and deletion behavior.
- [ ] Complete appropriate legal, security, and compliance review.

### Acceptance criteria

Do not advertise automatic live SBI synchronization until a supported integration is implemented, authorized, and tested.

---

## 15. Suggested MongoDB Collections

- `users` — profiles, preferences, target user persona (`student`, `young_professional`, `freelancer`, `family`, `small_business`), onboarding quiz responses (`onboardingCompleted`, `onboardingProfile`), and account status.
- `accounts` — user-defined accounts and connection metadata.
- `transactions` — normalized transactions.
- `imports` — statement processing jobs and import history.
- `budgets` — category and period-based limits.
- `categories` — system and user-defined categories.
- `recurringPayments` — candidate and confirmed recurring charges.
- `insights` — generated insights and evidence references.
- `conversations` and `messages` — AI conversation data subject to retention controls.
- `consents` — provider consent status and purpose metadata.
- `notifications` — alerts and delivery status.
- `auditEvents` — security-sensitive events.

### Suggested indexes

```javascript
db.transactions.createIndex({
  userId: 1,
  transactionDate: -1,
  _id: -1
});

db.transactions.createIndex({
  userId: 1,
  categoryId: 1,
  transactionDate: -1
});

db.imports.createIndex({
  userId: 1,
  createdAt: -1
});

db.budgets.createIndex({
  userId: 1,
  periodStart: 1,
  periodEnd: 1
});
```

Use a carefully designed unique deduplication key scoped to the user and source account where possible. Validate the index strategy against actual queries and data.

---

## 16. Suggested API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/transactions` | List and filter transactions |
| POST | `/api/transactions` | Create a manual transaction |
| PATCH | `/api/transactions/:id` | Edit an authorized transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |
| POST | `/api/imports` | Start an import |
| GET | `/api/imports/:id` | Check import status |
| POST | `/api/imports/:id/confirm` | Confirm a previewed import |
| GET | `/api/analytics/summary` | Retrieve calculated summaries |
| GET | `/api/analytics/categories` | Retrieve category breakdown |
| GET/POST | `/api/budgets` | List or create budgets |
| GET | `/api/insights` | List generated insights |
| POST | `/api/assistant/chat` | Ask a financial question |
| GET | `/api/recurring-payments` | Retrieve recurring-payment candidates |
| GET | `/api/onboarding` | Retrieve current user onboarding status and saved quiz responses |
| POST | `/api/onboarding` | Submit persona quiz answers, save profile, and auto-seed baseline categories/budgets |

All endpoints must enforce authentication, authorization, validation, pagination, consistent responses, and safe error handling.

---

## 17. Non-Functional Requirements

- **Performance:** Proposed target p95 below 500 ms for ordinary indexed API reads, excluding AI and file processing. Validate under load.
- **Reliability:** Durable jobs, retries, idempotency, and graceful failure handling.
- **Scalability:** Indexed queries, pagination, and independently scalable workers.
- **Accessibility:** Keyboard navigation, readable charts, and responsive layouts.
- **Data integrity:** Exact financial calculations and validated imports.
- **Observability:** Error monitoring, structured logs, and queue metrics.
- **Privacy:** Minimal data collection, documented retention, export, and deletion.
- **AI quality:** Evaluation datasets, grounded answers, and visible uncertainty.

---

## 18. Master Definition of Done

The MVP is ready for user testing when:

- [ ] Registration, login, and protected routes work.
- [ ] Post-registration persona-adaptive onboarding quiz works step-by-step ("one-by-one") and initializes baseline categories and budgets.
- [ ] Manual income and expense management works.
- [ ] A supported SBI statement or CSV file can be imported.
- [ ] Imports are previewed and validated before saving.
- [ ] Repeated imports do not create unintended duplicates.
- [ ] Search, filters, categories, and budgets work.
- [ ] Dashboard totals match independently verified calculations.
- [ ] AI answers use verified backend results.
- [ ] Users cannot read or modify another user's data.
- [ ] Import errors, retries, and malformed files are handled safely.
- [ ] Data export and deletion are implemented or explicitly documented as release blockers.
- [ ] Automated tests cover calculations, authorization, and imports.
- [ ] The deployed application works on desktop and mobile.
- [ ] Known limitations and unsupported bank formats are documented.

---

## 19. AI Coding Agent Master Prompt

Use this prompt with the PRD when working in an AI coding tool:

> You are a senior full-stack engineer, FinTech application architect, security reviewer, and QA engineer. Build and maintain PaisaPilot according to this PRD.
>
> First inspect the existing repository and report the current state. Do not regenerate the project from scratch.
>
> Work on one phase at a time. Identify missing requirements, propose a minimal implementation plan, make focused changes, run relevant tests and type checks, review security and financial correctness, and report the files changed and remaining issues.
>
> Preserve working features and existing conventions. Do not make unrelated changes or claim a feature works without verification. Use synthetic data during development. Never expose secrets or financial records to the client. Enforce server-side authorization on every protected operation. Calculate financial values in trusted backend code and use AI only for validated categorization and grounded explanations.
>
> Do not implement or simulate live SBI synchronization without a verified, authorized provider integration. Report missing credentials, unsupported formats, and unresolved compliance requirements.
>
> Mark a phase complete only when its acceptance criteria pass. Begin with a repository audit, not immediate code generation.

---

## 20. Implementation Order

1. Project setup and authentication.
2. Manual transaction management.
3. SBI CSV/PDF imports.
4. Dashboard and accurate reports.
5. AI categorization.
6. AI financial assistant.
7. Budgets, recurring-payment detection, and alerts.
8. Cash-flow forecasting.
9. Production hardening.
10. Authorized bank-data integration, if eligible.

**Guiding principle:** Build a trustworthy finance application first, then add AI to make it more useful. Security, accurate calculations, and clear evidence must take priority over the number of AI features.
