import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatPaiseToINR } from "../client/lib/utils";
import {
  CreateTransactionSchema,
  TransactionQuerySchema,
} from "../server/models/transaction";
import { CreateAccountSchema } from "../server/models/account";

describe("Exact Integer Paise Money Arithmetic & Formatting", () => {
  test("formats standard integer paise to INR currency string", () => {
    assert.equal(formatPaiseToINR(100050), "₹1,000.50");
    assert.equal(formatPaiseToINR(50000), "₹500.00");
    assert.equal(formatPaiseToINR(99), "₹0.99");
    assert.equal(formatPaiseToINR(5), "₹0.05");
  });

  test("handles zero paise without sign", () => {
    assert.equal(formatPaiseToINR(0), "₹0.00");
  });

  test("handles negative paise (debits/deficits) with proper minus sign", () => {
    assert.equal(formatPaiseToINR(-45000), "-₹450.00");
    assert.equal(formatPaiseToINR(-75), "-₹0.75");
  });

  test("formats large Indian currency amounts according to Indian grouping (lakhs)", () => {
    // 10,00,000 INR = 100,000,000 paise
    const formatted = formatPaiseToINR(100000000);
    assert.equal(formatted, "₹10,00,000.00");
  });

  test("integer paise addition and subtraction prevents floating-point drift", () => {
    // Classic JavaScript float bug: 0.1 + 0.2 = 0.30000000000000004
    // With integer paise: 10 paise + 20 paise = 30 paise exactly
    const item1Paise = 10;
    const item2Paise = 20;
    const totalPaise = item1Paise + item2Paise;
    assert.equal(totalPaise, 30);
    assert.equal(formatPaiseToINR(totalPaise), "₹0.30");

    // Subtracting expenses from income
    const incomePaise = 7500000; // ₹75,000.00
    const rentPaise = 2500000;   // ₹25,000.00
    const foodPaise = 1245050;   // ₹12,450.50
    const remainingPaise = incomePaise - rentPaise - foodPaise;

    assert.equal(remainingPaise, 3754950);
    assert.equal(formatPaiseToINR(remainingPaise), "₹37,549.50");
  });
});

describe("Transaction Zod Schema Validation & Boundary Rules", () => {
  test("accepts valid income, expense, and transfer payloads", () => {
    const validExpense = CreateTransactionSchema.safeParse({
      type: "expense",
      amountPaise: 45000, // ₹450.00
      transactionDate: "2026-10-14",
      description: "Grocery purchase at DMart",
      paymentMode: "upi",
    });
    assert.equal(validExpense.success, true);

    const validTransfer = CreateTransactionSchema.safeParse({
      type: "transfer",
      amountPaise: 1000000, // ₹10,000.00
      transactionDate: "2026-10-14",
      description: "Transfer to Savings",
      accountId: "acc_1",
      toAccountId: "acc_2",
    });
    assert.equal(validTransfer.success, true);
  });

  test("rejects non-integer paise amounts", () => {
    const invalid = CreateTransactionSchema.safeParse({
      type: "expense",
      amountPaise: 450.75, // float is forbidden
      transactionDate: "2026-10-14",
      description: "Invalid Float",
    });
    assert.equal(invalid.success, false);
  });

  test("rejects zero and negative transaction amounts", () => {
    const zeroAmount = CreateTransactionSchema.safeParse({
      type: "expense",
      amountPaise: 0,
      transactionDate: "2026-10-14",
      description: "Zero amount",
    });
    assert.equal(zeroAmount.success, false);

    const negativeAmount = CreateTransactionSchema.safeParse({
      type: "expense",
      amountPaise: -5000,
      transactionDate: "2026-10-14",
      description: "Negative amount",
    });
    assert.equal(negativeAmount.success, false);
  });

  test("enforces length boundaries on description", () => {
    const emptyDesc = CreateTransactionSchema.safeParse({
      type: "expense",
      amountPaise: 1000,
      transactionDate: "2026-10-14",
      description: "   ",
    });
    assert.equal(emptyDesc.success, false);

    const oversizedDesc = CreateTransactionSchema.safeParse({
      type: "expense",
      amountPaise: 1000,
      transactionDate: "2026-10-14",
      description: "a".repeat(201),
    });
    assert.equal(oversizedDesc.success, false);
  });
});

describe("Account & Payment Source Validation", () => {
  test("validates account types", () => {
    const valid = CreateAccountSchema.safeParse({
      name: "HDFC Salary Account",
      type: "bank_account",
      institution: "HDFC Bank",
      accountNumberMasked: "•••• 4821",
      initialBalancePaise: 2500000,
    });
    assert.equal(valid.success, true);
  });

  test("rejects unsupported account types", () => {
    const invalid = CreateAccountSchema.safeParse({
      name: "Crypto Stash",
      type: "crypto_wallet", // not supported
    });
    assert.equal(invalid.success, false);
  });

  test("defaults initial balance to 0 integer paise", () => {
    const parsed = CreateAccountSchema.safeParse({
      name: "Cash in Wallet",
      type: "cash",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.initialBalancePaise, 0);
    }
  });
});

describe("Transaction Query Validation", () => {
  test("applies default pagination parameters", () => {
    const parsed = TransactionQuerySchema.safeParse({});
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.page, 1);
      assert.equal(parsed.data.limit, 20);
    }
  });

  test("parses string numbers to integers safely", () => {
    const parsed = TransactionQuerySchema.safeParse({ page: "3", limit: "50" });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.page, 3);
      assert.equal(parsed.data.limit, 50);
    }
  });
});
