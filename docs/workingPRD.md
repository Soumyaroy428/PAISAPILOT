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
| Authentication & Session Management (Register, Login, Session cookies) | `PARTIAL` | Auth UI entry screens (`/login`, `/register`) created; backend auth scheduled for Checkpoint 2. |
| Persona-Adaptive Onboarding Quiz | `NOT STARTED` | Spec defined in `prd.md` & `trd.md`; scheduled for Checkpoint 2. |
| Accounts & Payment Sources (`accounts` collection, labels) | `NOT STARTED` | No schema or CRUD routes implemented. |
| Manual Income & Expense Transactions (Paise math, CRUD, filters) | `NOT STARTED` | Integer paise conversion utility created (`formatPaiseToINR`); transaction domain scheduled for Checkpoint 3. |
| Statement Import Pipeline (CSV / SBI PDF, parsing, preview, commit) | `NOT STARTED` | Scheduled for Checkpoint 4. |
| Financial Dashboard & Analytics (Totals, trends, categories, Recharts) | `NOT STARTED` | Scheduled for Checkpoint 5. |
| Transaction Categorization (Deterministic rules + AI fallback) | `NOT STARTED` | Scheduled for Checkpoint 6. |
| Grounded AI Finance Assistant (Restricted tools, prompt-injection defense) | `NOT STARTED` | Scheduled for Checkpoint 7. |
| Budgets, Recurring Payments & Notifications | `NOT STARTED` | Scheduled for Checkpoint 8. |
| Cash-Flow Forecasting & Insights | `NOT STARTED` | Scheduled for Checkpoint 9. |
| Privacy Controls, Data Export & Account Deletion | `PARTIAL` | Legal/Privacy screens (`/privacy`, `/terms`, `/security`) live; functional export/deletion scheduled for Checkpoint 10. |
| Production Hardening & CI/CD | `NOT STARTED` | Next.js production build passes locally; CI/CD scheduled for Checkpoint 10. |
| Authorized Bank Integration (Account Aggregator) | `NOT STARTED` | Explicitly deferred until verified provider eligibility. |

---

## 5. Verification & Tests Executed

- **Lint / Type Check:** `npm run type-check` (`tsc --noEmit`) -> **PASS (0 errors)**.
- **Production Build:** `npm run build` (`next build` with Turbopack) -> **PASS (12 static & dynamic routes compiled successfully)**.
- **Health Check Smoke Test:** `http://localhost:3007/api/health` -> **PASS (Returned HTTP 200 `{"status":"ok","app":"PaisaPilot","version":"1.0.0"}`)**.
- **Directory Structure:** Refactored into clean `src/client/` (frontend components, UI, layout, utilities) and `src/server/` (backend services, env validation) separation with verified path aliases.

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

