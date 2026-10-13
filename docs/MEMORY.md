# PaisaPilot — Project Memory and Continuity

Update this file whenever a durable product or technical decision changes.

## Product identity
- Name: PaisaPilot
- Purpose: AI-powered personal finance intelligence.
- Initial market/currency context: India / INR.
- Principle: trustworthy financial data first, AI explanations second.

## Planned capabilities
Manual transactions; accounts/payment sources; CSV and specifically tested statement PDF imports; categorization; dashboard analytics; budgets; recurring-payment tracking; AI assistant; explainable insights and forecasts; reports/export; notifications; privacy settings; account deletion.

Future capability: eligible, consent-based bank-data integration only after provider, legal, technical, and regulatory verification.

## Preferred technology direction
Next.js App Router, React, TypeScript, Tailwind CSS, MongoDB Atlas, server-side Route Handlers/domain services, a background worker, runtime validation, and an AI provider adapter. Start as a modular monolith; do not introduce microservices without a measured need.

## Non-negotiable finance rules
1. Use integer paise for INR or another exact, documented representation. Do not use binary floating-point as the financial source of truth.
2. Financial totals are calculated by deterministic code, not invented by an LLM.
3. Every user-owned record and operation is scoped to the authenticated user.
4. A statement import is historical data, not proof of a live bank balance.
5. Imports must be previewed, validated, deduplicated, and safe to retry.
6. Display data coverage and date ranges.
7. Never request bank passwords, UPI PINs, card PINs, or OTPs.
8. Never assume direct public SBI API access.
9. AI has no arbitrary database access or unapproved tools.
10. Do not log secrets or sensitive statement contents.

## Development conventions
Inspect the repository before editing. Implement one phase at a time. Keep business logic out of UI components. Validate all external input server-side. Add tests for calculations, authorization, imports, and edge cases. Run actual lint, type-check, tests, and build commands before declaring completion. Report limitations honestly.

## Repository documents
- `PRD.md`: product requirements and roadmap
- `ARCHITECTURE.md`: architecture and data flows
- `DESIGN.md`: UI/UX rules
- `MEMORY.md`: durable context
- `RULES.md`: contributor and AI-agent constraints
- `TASKS.md`: phased implementation checklist

## Open decisions
Exact auth library, deployment host, AI provider, storage provider, job queue, and tested statement formats must be chosen and verified during implementation.
