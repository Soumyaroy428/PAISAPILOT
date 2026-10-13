# PaisaPilot — Product and UI Design System

## Design principles
- Clarity before decoration; trustworthy financial information before visual effects.
- Mobile-first, responsive, keyboard-accessible screens.
- Neutral, supportive language; never shame users about spending.
- Every data-driven screen has loading, empty, error, and success states.
- Show data coverage and date ranges; distinguish historical imports from live data.

## Visual direction
Use a clean FinTech dashboard, a light theme initially, restrained accent colors, consistent spacing, and readable typography. Income, expense, warning, and danger states must include text/icons—not color alone. Test contrast against WCAG AA.

## Public website
- Header: logo, product/features, security, FAQ, sign in, primary CTA.
- Hero: value proposition, sign-up CTA, how-it-works link, product preview.
- Feature overview: transactions, statement imports, budgets, AI insights, reports.
- Security/privacy section, FAQ, footer, terms, and privacy links.
- Avoid unsupported claims such as “connects to every bank” or “100% accurate.”

## Authenticated layout
Desktop: side navigation, top bar, main content, optional insight panel.
Mobile: compact top bar and accessible drawer/bottom navigation.
Navigation: Overview, Transactions, Accounts, Imports, Budgets, Recurring, Insights, AI Assistant, Reports, Settings.

## Required screens
### Landing page
Explain the product, audience, core features, privacy approach, and clear sign-up/sign-in routes.

### Authentication
Visible labels, inline validation, recovery flow, safe generic errors, and no requests for bank credentials or PINs.

### Onboarding
Minimal questions, progress indicator, skippable optional steps, clear explanations for requested data, and a useful empty state.

### Dashboard
Income, expenses, net cash flow, budget status, trends, category breakdown, recent transactions, period selector, and “data through” date where applicable.

### Transactions
Search, filters, pagination, add/edit form, category/account selection, source indicator, and deletion confirmation.

### Statement import
Stepper: Upload → Parse → Review → Confirm → Results. Preview parsed rows and warnings; show duplicates, skipped, failed, and imported counts. Never silently commit a file.

### Budgets and recurring payments
Show target, spent, remaining, period, and alert thresholds. Distinguish detected recurring candidates from user-confirmed recurring rules.

### AI assistant and insights
Show date range, data coverage, assumptions, and links to supporting views. Label estimates clearly and do not present outcomes as guaranteed.

### Reports and settings
Secure export, profile, preferences, notifications, security, privacy, data export, and confirmed account deletion.

## Design tokens
Define centralized tokens for background, surface, text, muted text, border, primary, income, expense, warning, danger, radii, spacing, and shadows. Avoid scattering raw design values throughout components.

## Reusable components
Buttons, fields, amount input, selects, date picker, dialogs, drawers, toasts, tooltips, tables, pagination, filter bar, metric cards, chart containers, empty states, skeletons, inline errors, import stepper, validation badges, confirmation dialogs.

## Accessibility acceptance
All controls work by keyboard; focus is visible; inputs have labels; errors are associated with fields; charts have text/table alternatives; reduced motion is respected; responsive layouts are checked on mobile, tablet, and desktop.
