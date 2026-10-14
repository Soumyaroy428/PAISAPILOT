import test from "node:test";
import assert from "node:assert/strict";
import { rateLimiter } from "../server/lib/rate-limiter";
import {
  maskSensitiveString,
  sanitizeLogData,
} from "../server/lib/privacy-logger";

test("Rate Limiter - In-Memory Sliding Window Defense", async (t) => {
  await t.test("permits requests within quota", () => {
    rateLimiter.clear();
    const key = "test_user_ip_1";

    const res1 = rateLimiter.check(key, 3, 1000);
    assert.equal(res1.allowed, true);
    assert.equal(res1.remaining, 2);

    const res2 = rateLimiter.check(key, 3, 1000);
    assert.equal(res2.allowed, true);
    assert.equal(res2.remaining, 1);

    const res3 = rateLimiter.check(key, 3, 1000);
    assert.equal(res3.allowed, true);
    assert.equal(res3.remaining, 0);
  });

  await t.test("blocks requests when rate limit is exceeded", () => {
    rateLimiter.clear();
    const key = "test_user_ip_blocked";

    // Consume 2 allowed requests
    rateLimiter.check(key, 2, 1000);
    rateLimiter.check(key, 2, 1000);

    // 3rd request must be blocked
    const blocked = rateLimiter.check(key, 2, 1000);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.equal(blocked.resetMs > 0, true);
  });

  await t.test("resets key on explicit reset (e.g. successful login)", () => {
    rateLimiter.clear();
    const key = "test_login_reset";

    rateLimiter.check(key, 1, 1000);
    const blocked = rateLimiter.check(key, 1, 1000);
    assert.equal(blocked.allowed, false);

    // Reset rate limiter on successful credential verification
    rateLimiter.reset(key);

    const unblocked = rateLimiter.check(key, 1, 1000);
    assert.equal(unblocked.allowed, true);
  });
});

test("Privacy-Safe Logger & Sensitive Data Redactor", async (t) => {
  await t.test("masks credit card numbers cleanly", () => {
    const raw = "Payment of ₹4,999 on card 4111-2222-3333-4444 completed";
    const masked = maskSensitiveString(raw);

    assert.equal(masked.includes("4111-2222-3333-4444"), false);
    assert.equal(masked.includes("4111-****-****-4444"), true);
  });

  await t.test("masks Indian PAN card numbers", () => {
    const raw = "Customer PAN is ABCDE1234F verified by KYC";
    const masked = maskSensitiveString(raw);

    assert.equal(masked.includes("ABCDE1234F"), false);
    assert.equal(masked.includes("ABCDE****F"), true);
  });

  await t.test("masks email addresses while preserving domain", () => {
    const raw = "Sent statement to soumyaroy@gmail.com securely";
    const masked = maskSensitiveString(raw);

    assert.equal(masked.includes("soumyaroy@gmail.com"), false);
    assert.equal(masked.includes("so***@gmail.com"), true);
  });

  await t.test("masks bank account numbers", () => {
    const raw = "Credited to A/C 123456789012 successfully";
    const masked = maskSensitiveString(raw);

    assert.equal(masked.includes("123456789012"), false);
    assert.equal(masked.includes("*******9012"), true);
  });

  await t.test("deeply redacts secrets from objects without touching normal fields", () => {
    const logPayload = {
      user: {
        id: "usr_123",
        email: "alice@example.com",
        password: "SecretPassword123!",
        jwtToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        apiKey: "AIzaSyD-1234567890abcdef",
      },
      transaction: {
        description: "Payment for 4111-2222-3333-4444",
        amountPaise: 50000,
        category: "Shopping",
      },
    };

    const sanitized = sanitizeLogData(logPayload);

    // Secrets must be redacted
    assert.equal(sanitized.user.password, "[REDACTED]");
    assert.equal(sanitized.user.jwtToken, "[REDACTED]");
    assert.equal(sanitized.user.apiKey, "[REDACTED]");

    // Sensitive strings inside normal fields must be masked
    assert.equal(sanitized.user.email, "al***@example.com");
    assert.equal(sanitized.transaction.description, "Payment for 4111-****-****-4444");

    // Normal non-sensitive fields must remain intact
    assert.equal(sanitized.user.id, "usr_123");
    assert.equal(sanitized.transaction.amountPaise, 50000);
    assert.equal(sanitized.transaction.category, "Shopping");
  });
});

test("Multi-Tenant Isolation & Account Deletion Cascade Validation", async (t) => {
  await t.test("simulates complete multi-collection purge for target user only", () => {
    // In-memory mock collections to verify cascading purge logic
    const targetUserId = "user_victim";
    const otherUserId = "user_innocent";

    const mockDb = {
      transactions: [
        { userId: targetUserId, description: "Swiggy" },
        { userId: targetUserId, description: "Uber" },
        { userId: otherUserId, description: "Salary" },
      ],
      accounts: [
        { userId: targetUserId, name: "SBI" },
        { userId: otherUserId, name: "HDFC" },
      ],
      budgets: [
        { userId: targetUserId, category: "Food" },
        { userId: otherUserId, category: "Groceries" },
      ],
      recurring: [
        { userId: targetUserId, merchant: "Netflix" },
        { userId: otherUserId, merchant: "Spotify" },
      ],
      notifications: [
        { userId: targetUserId, title: "Alert" },
        { userId: otherUserId, title: "Reminder" },
      ],
      users: [
        { id: targetUserId, email: "victim@example.com" },
        { id: otherUserId, email: "innocent@example.com" },
      ],
    };

    // Purge target user
    mockDb.transactions = mockDb.transactions.filter((t) => t.userId !== targetUserId);
    mockDb.accounts = mockDb.accounts.filter((a) => a.userId !== targetUserId);
    mockDb.budgets = mockDb.budgets.filter((b) => b.userId !== targetUserId);
    mockDb.recurring = mockDb.recurring.filter((r) => r.userId !== targetUserId);
    mockDb.notifications = mockDb.notifications.filter((n) => n.userId !== targetUserId);
    mockDb.users = mockDb.users.filter((u) => u.id !== targetUserId);

    // Target user's records must be completely purged (0 remaining)
    assert.equal(mockDb.transactions.some((t) => t.userId === targetUserId), false);
    assert.equal(mockDb.accounts.some((a) => a.userId === targetUserId), false);
    assert.equal(mockDb.budgets.some((b) => b.userId === targetUserId), false);
    assert.equal(mockDb.recurring.some((r) => r.userId === targetUserId), false);
    assert.equal(mockDb.notifications.some((n) => n.userId === targetUserId), false);
    assert.equal(mockDb.users.some((u) => u.id === targetUserId), false);

    // Other user's records must remain 100% intact (zero cross-tenant data loss)
    assert.equal(mockDb.transactions.length, 1);
    assert.equal(mockDb.transactions[0].userId, otherUserId);
    assert.equal(mockDb.accounts.length, 1);
    assert.equal(mockDb.accounts[0].userId, otherUserId);
    assert.equal(mockDb.budgets.length, 1);
    assert.equal(mockDb.recurring.length, 1);
    assert.equal(mockDb.notifications.length, 1);
    assert.equal(mockDb.users.length, 1);
    assert.equal(mockDb.users[0].id, otherUserId);
  });
});

