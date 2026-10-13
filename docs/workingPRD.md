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
  - `PaisaPilot` directory currently does not contain an independent `.git` directory (`Test-Path .git` -> `False`).
  - Active parent git context was inherited from user home directory (`C:/Users/soumy`).
  - **Action Required in Checkpoint 1:** Initialize an isolated Git repository (`git init`) within `PaisaPilot` with a strict `.gitignore` blocking `.env*`, `node_modules`, build artifacts, and private statements.
- **Node Environment:**
  - Node: `v22.21.0`
  - npm: `11.12.1`
  - Git: `2.51.2.windows.1`
- **Source Code Status:**
  - No `package.json`, lockfile, application code (`src/`), or configuration files exist yet.
  - Project currently consists solely of specification documents organized into `docs/` and `pdf/`.

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
| Project Setup & Tooling (Next.js, TS, Tailwind, shadcn) | `NOT STARTED` | No `package.json` or source files in workspace. |
| Public Website (Landing, Features, How it Works, Security, FAQ, Footer) | `NOT STARTED` | No routes or UI implemented. |
| Authentication & Session Management (Register, Login, Session cookies) | `NOT STARTED` | No auth provider or endpoints implemented. |
| Persona-Adaptive Onboarding Quiz | `NOT STARTED` | Spec defined in `prd.md` & `trd.md`; no code yet. |
| Accounts & Payment Sources (`accounts` collection, labels) | `NOT STARTED` | No schema or CRUD routes implemented. |
| Manual Income & Expense Transactions (Paise math, CRUD, filters) | `NOT STARTED` | No transaction domain or calculation module yet. |
| Statement Import Pipeline (CSV / SBI PDF, parsing, preview, commit) | `NOT STARTED` | No parser adapters or worker queue yet. |
| Financial Dashboard & Analytics (Totals, trends, categories, Recharts) | `NOT STARTED` | No calculation engine or charts yet. |
| Transaction Categorization (Deterministic rules + AI fallback) | `NOT STARTED` | No category taxonomy or rules engine yet. |
| Grounded AI Finance Assistant (Restricted tools, prompt-injection defense) | `NOT STARTED` | No AI gateway or tools implemented yet. |
| Budgets, Recurring Payments & Notifications | `NOT STARTED` | No budget models, detection algorithms, or alert jobs yet. |
| Cash-Flow Forecasting & Insights | `NOT STARTED` | No projection baseline model implemented yet. |
| Privacy Controls, Data Export & Account Deletion | `NOT STARTED` | Endpoints and state machines not yet implemented. |
| Production Hardening & CI/CD | `NOT STARTED` | No GitHub Actions workflow or deployment setup yet. |
| Authorized Bank Integration (Account Aggregator) | `NOT STARTED` | Explicitly deferred until verified provider eligibility. |

---

## 5. Verification & Tests Executed

- **Lint / Type Check:** N/A (`package.json` not yet initialized; no JS/TS files to lint).
- **Unit / Integration / E2E Tests:** N/A (Test runners Vitest / Playwright not yet initialized).
- **Production Build:** N/A (Build script not yet available).
- **Environment & Directory Inspection:** Executed (`node -v`, `npm -v`, `git status`, file tree scans). Confirmed clean directory containing only documentation.

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

- **Vercel Readiness:** `NOT READY` (Application not yet created; requires Next.js project initialization, `.env.example`, and clean build).
- **Render Readiness:** `NOT READY` (Persistent worker not yet required or created).
- **Blockers:**
  1. Project skeleton needs initialization.
  2. MongoDB connection string placeholder and configuration needed.
  3. Authentication secret and provider configuration needed.

---

## 8. Next Recommended Checkpoint

- **Checkpoint 1 — Project Setup and Public Website:**
  - Initialize Next.js App Router with TypeScript and Tailwind CSS.
  - Initialize isolated Git repository and `.gitignore`.
  - Install and configure UI primitives (shadcn/ui, Lucide icons).
  - Configure server-only environment validation and safe `.env.example`.
  - Implement public website routes: Landing page (`/`), Features (`/features`), How It Works (`/how-it-works`), Security (`/security`), FAQ (`/faq`), Terms (`/terms`), Privacy (`/privacy`), Header, and Footer.
  - Implement `/api/health` safe health check endpoint.
  - Verify lint, type-check, and local production build pass.

