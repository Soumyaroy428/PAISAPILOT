# PaisaPilot Production Deployment, Security & Operations Guide

## 1. Production Architecture Overview

PaisaPilot is architected as a high-performance, full-stack Next.js application deployed on **Vercel** serverless infrastructure paired with a managed **MongoDB Atlas** cluster.

```
                      +-----------------------------+
                      |       User Browser          |
                      | (Desktop / Tablet / Mobile) |
                      +--------------+--------------+
                                     |
                                     | HTTPS (TLS 1.3)
                                     v
                      +-----------------------------+
                      |      Vercel Edge & DNS      |
                      |  (Auto SSL, DDoS Defense)   |
                      +--------------+--------------+
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
        +-----------------------+         +-----------------------+
        | Static Prerendered UI |         | Dynamic Serverless    |
        | Pages (Turbopack)     |         | API Route Handlers    |
        | - /dashboard          |         | - /api/auth/*         |
        | - /dashboard/forecast |         | - /api/transactions  |
        | - /dashboard/budgets  |         | - /api/assistant/chat |
        | - /dashboard/import   |         | - /api/analytics/*    |
        +-----------------------+         +-----------+-----------+
                                                      |
                                                      | Strict Integer Paise Math
                                                      | In-Memory Rate Limiting
                                                      | IDOR Multi-Tenant Scoping
                                                      |
                                                      v
                                      +-------------------------------+
                                      |   MongoDB Atlas (Serverless/M0)|
                                      |   - users, accounts, txns     |
                                      |   - categories, budgets       |
                                      |   - recurring, notifications  |
                                      |   - compound unique indexes   |
                                      +-------------------------------+
```

---

## 2. Environment Variables Checklist

Add these environment variables in your **Vercel Project Settings > Environment Variables** (and locally in `.env.local`):

| Variable Name | Required | Example / Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | **Yes** | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/paisapilot?retryWrites=true&w=majority` |
| `AUTH_SECRET` | **Yes** | 32+ character high-entropy cryptographic secret for signing AES-256 JWT cookies. Generate with `openssl rand -hex 32`. |
| `GEMINI_API_KEY` | Optional | Free Google AI Studio API key for natural language Copilot chat (`gemini-3.8-flash`). If omitted, grounded zero-hallucination deterministic fallback activates automatically. |
| `NODE_ENV` | Automatic | Set to `production` automatically by Vercel. |

---

## 3. Security & Multi-Tenant Isolation Controls

1. **Strict Multi-Tenant Scoping (IDOR Defense):**
   - Every database query and mutation strictly enforces `{ _id: recordId, userId: authenticatedUserId }`.
   - Client-provided user identities in request bodies or query parameters are never trusted.
2. **Session Protection:**
   - Sessions are signed with HS256/AES JWT tokens and stored in `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookies (`paisapilot_session`).
   - JavaScript cannot read session cookies (immune to XSS token theft).
3. **In-Memory Sliding-Window Rate Limiting (`server/lib/rate-limiter.ts`):**
   - Login: 10 attempts/min per IP.
   - Registration: 5 attempts/min per IP.
   - Account deletion: 5 attempts/15 min per IP.
   - AI assistant: 20 prompts/min per user.
4. **Formula Injection (CSV Injection) Neutralization:**
   - Export service strips and prepends quotes to formula trigger symbols (`=`, `+`, `-`, `@`) preventing spreadsheet remote code execution.
5. **Privacy-Safe Logging (`server/lib/privacy-logger.ts`):**
   - Automatically masks 16-digit card numbers, Indian PAN numbers, emails, and bank account numbers in server logs.
   - Redacts password, secret, token, apiKey, and cookie fields from logged objects.
6. **Right to be Forgotten & Data Portability (`server/services/user-deletion.service.ts`):**
   - Users can download complete unencrypted JSON/CSV archives of their financial records from `/dashboard/settings`.
   - Users can permanently purge their account with password confirmation, cascading deletions across all 8 MongoDB collections (`transactions`, `accounts`, `categories`, `budgets`, `recurring`, `notifications`, `imports`, and `users`).

---

## 4. Disaster Recovery & Backup / Restore

1. **Automated MongoDB Atlas Backups:**
   - Enable Continuous Cloud Backups in your MongoDB Atlas cluster settings (free in M10+ or point-in-time snapshot available in serverless/dedicated).
2. **Point-In-Time Restore Procedure:**
   - If accidental data corruption occurs:
     1. Open MongoDB Atlas Console > Clusters > Select Cluster > **Backup**.
     2. Choose "Restore Snapshot".
     3. Select the point in time (e.g. 1 hour prior).
     4. Restore to a new target cluster or in-place, and update `MONGODB_URI` in Vercel if targeting a new cluster.

---

## 5. Vercel Zero-Downtime Deployment & Instant Rollback

1. **Deploying Updates:**
   - Every push to the `main` branch automatically triggers an optimized Turbopack production build and instant preview deployment.
2. **Instant One-Click Rollback:**
   - If an unexpected regression occurs in production:
     1. Go to **Vercel Dashboard > Deployments**.
     2. Find the previous stable deployment (e.g. commit hash).
     3. Click the three dots (`...`) > **Rollback to this Deployment**.
     4. Production traffic immediately cuts over to the previous build in under 5 seconds with zero downtime.

---

## 6. Optional Render Background Worker

PaisaPilot is completely self-contained on Vercel with zero persistent server requirements for all standard user operations.

If you ever decide to introduce a persistent 24/7 background worker (e.g. an always-running cron daemon that does not rely on scheduled API invocations):
1. **Never deploy without user approval** (as per project mandate).
2. Create a background worker service in Render connecting to the same `MONGODB_URI`.
3. Set the Start Command to `npm run worker` (if configured in future phases).
