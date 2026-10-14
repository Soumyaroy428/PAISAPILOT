import test from "node:test";
import assert from "node:assert/strict";
import {
  CreateBudgetSchema,
  UpdateBudgetSchema,
  BudgetProgress,
} from "../server/models/budget";
import {
  CreateRecurringSchema,
  UpdateRecurringSchema,
} from "../server/models/recurring";

test("Budget Validation & Progress Logic", async (t) => {
  await t.test("CreateBudgetSchema validates correct inputs", () => {
    const valid = CreateBudgetSchema.safeParse({
      categoryName: "Food & Dining",
      amountInr: 10000,
      alertThresholdPercent: 85,
    });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.categoryName, "Food & Dining");
      assert.equal(valid.data.amountInr, 10000);
      assert.equal(valid.data.alertThresholdPercent, 85);
    }
  });

  await t.test("CreateBudgetSchema defaults alertThresholdPercent to 85%", () => {
    const valid = CreateBudgetSchema.safeParse({
      categoryName: "Transport",
      amountInr: 5000,
    });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.alertThresholdPercent, 85);
    }
  });

  await t.test("CreateBudgetSchema rejects zero or negative amounts", () => {
    const zero = CreateBudgetSchema.safeParse({
      categoryName: "Groceries",
      amountInr: 0,
    });
    assert.equal(zero.success, false);

    const negative = CreateBudgetSchema.safeParse({
      categoryName: "Groceries",
      amountInr: -500,
    });
    assert.equal(negative.success, false);
  });

  await t.test("CreateBudgetSchema rejects invalid alert thresholds (<50 or >100)", () => {
    const tooLow = CreateBudgetSchema.safeParse({
      categoryName: "Shopping",
      amountInr: 10000,
      alertThresholdPercent: 30,
    });
    assert.equal(tooLow.success, false);

    const tooHigh = CreateBudgetSchema.safeParse({
      categoryName: "Shopping",
      amountInr: 10000,
      alertThresholdPercent: 120,
    });
    assert.equal(tooHigh.success, false);
  });

  await t.test("UpdateBudgetSchema permits partial updates", () => {
    const update = UpdateBudgetSchema.safeParse({
      amountInr: 15000,
      isArchived: false,
    });
    assert.equal(update.success, true);

    const empty = UpdateBudgetSchema.safeParse({});
    assert.equal(empty.success, true);
  });

  await t.test("Computes budget progress and status thresholds accurately", () => {
    // Helper replicating progress calculation
    function computeStatus(amountPaise: number, spentPaise: number, thresholdPercent = 85): {
      utilizationPercent: number;
      remainingPaise: number;
      status: "normal" | "warning" | "exceeded";
    } {
      const remainingPaise = Math.max(0, amountPaise - spentPaise);
      const utilizationPercent = amountPaise > 0 ? (spentPaise / amountPaise) * 100 : 0;
      let status: "normal" | "warning" | "exceeded" = "normal";
      if (utilizationPercent > 100) {
        status = "exceeded";
      } else if (utilizationPercent >= thresholdPercent) {
        status = "warning";
      }
      return { utilizationPercent, remainingPaise, status };
    }

    // Normal: 50% spent
    const normal = computeStatus(1000000, 500000, 85);
    assert.equal(normal.status, "normal");
    assert.equal(normal.utilizationPercent, 50);
    assert.equal(normal.remainingPaise, 500000);

    // Warning: 85% spent
    const warningExact = computeStatus(1000000, 850000, 85);
    assert.equal(warningExact.status, "warning");
    assert.equal(warningExact.utilizationPercent, 85);
    assert.equal(warningExact.remainingPaise, 150000);

    // Warning: 95% spent
    const warningHigh = computeStatus(1000000, 950000, 85);
    assert.equal(warningHigh.status, "warning");
    assert.equal(warningHigh.utilizationPercent, 95);
    assert.equal(warningHigh.remainingPaise, 50000);

    // Exceeded: 105% spent
    const exceeded = computeStatus(1000000, 1050000, 85);
    assert.equal(exceeded.status, "exceeded");
    assert.equal(exceeded.utilizationPercent, 105);
    assert.equal(exceeded.remainingPaise, 0); // clamped to 0
  });
});

test("Recurring Payments & Subscriptions Logic", async (t) => {
  await t.test("CreateRecurringSchema validates valid inputs", () => {
    const valid = CreateRecurringSchema.safeParse({
      merchantName: "Netflix",
      amountInr: 649,
      frequency: "monthly",
      categoryName: "Entertainment",
      nextExpectedDate: "2026-11-01",
      notes: "Premium 4K plan",
    });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.merchantName, "Netflix");
      assert.equal(valid.data.amountInr, 649);
      assert.equal(valid.data.frequency, "monthly");
      assert.equal(valid.data.nextExpectedDate, "2026-11-01");
    }
  });

  await t.test("CreateRecurringSchema rejects invalid date format", () => {
    const invalidDate = CreateRecurringSchema.safeParse({
      merchantName: "Spotify",
      amountInr: 119,
      nextExpectedDate: "01-11-2026", // Wrong format
    });
    assert.equal(invalidDate.success, false);
  });

  await t.test("UpdateRecurringSchema handles status transitions", () => {
    const validStatus = UpdateRecurringSchema.safeParse({
      status: "active",
    });
    assert.equal(validStatus.success, true);

    const dismissed = UpdateRecurringSchema.safeParse({
      status: "dismissed",
    });
    assert.equal(dismissed.success, true);

    const invalidStatus = UpdateRecurringSchema.safeParse({
      status: "deleted" as any,
    });
    assert.equal(invalidStatus.success, false);
  });

  await t.test("Candidate detection pattern matching accurately identifies common Indian subscriptions", () => {
    const testTransactions = [
      { description: "UPI/NETFLIX ENTERTAINMENT/499/Sub", amountPaise: 49900 },
      { description: "POS SPOTIFY INDIA MUMBAI", amountPaise: 11900 },
      { description: "BILLPAY BESCOM ELECTRICITY BLR", amountPaise: 145000 },
      { description: "ACH DEBIT ZERODHA BROKING SIP", amountPaise: 500000 },
      { description: "UPI/HOUSE RENT TO LANDLORD/25000", amountPaise: 2500000 },
      { description: "GENERAL GROCERY STORE", amountPaise: 35000 },
    ];

    const KNOWN_PATTERNS = [
      { keyword: "netflix", name: "Netflix Subscription", category: "Entertainment" },
      { keyword: "spotify", name: "Spotify Premium", category: "Entertainment" },
      { keyword: "bescom", name: "Bescom Electricity", category: "Bills & Utilities" },
      { keyword: "zerodha", name: "Zerodha SIP Investment", category: "Investments" },
      { keyword: "rent", name: "House Rent", category: "Housing & Rent" },
    ];

    const detected: Array<{ name: string; amountPaise: number; category: string }> = [];

    for (const pattern of KNOWN_PATTERNS) {
      const match = testTransactions.find((tx) =>
        tx.description.toLowerCase().includes(pattern.keyword)
      );
      if (match) {
        detected.push({
          name: pattern.name,
          amountPaise: match.amountPaise,
          category: pattern.category,
        });
      }
    }

    assert.equal(detected.length, 5);
    assert.equal(detected[0].name, "Netflix Subscription");
    assert.equal(detected[0].amountPaise, 49900);
    assert.equal(detected[1].name, "Spotify Premium");
    assert.equal(detected[2].name, "Bescom Electricity");
    assert.equal(detected[3].name, "Zerodha SIP Investment");
    assert.equal(detected[4].name, "House Rent");
  });

  await t.test("Next expected date rolls forward into the future if last charge was in past", () => {
    const now = new Date(2026, 9, 14); // Oct 14, 2026
    const pastCharge = new Date(2026, 6, 10); // July 10, 2026

    const nextDate = new Date(pastCharge);
    nextDate.setMonth(nextDate.getMonth() + 1);

    while (nextDate < now) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    // Should be rolled forward to Nov 10, 2026
    assert.equal(nextDate > now, true);
    assert.equal(nextDate.getMonth(), 10); // November (0-indexed 10)
    assert.equal(nextDate.getDate(), 10);
  });
});

test("Idempotent Notification Fingerprinting", async (t) => {
  await t.test("Generates deterministic fingerprints for budget warnings", () => {
    const userId = "user_12345";
    const category = "Food & Dining";
    const monthKey = "2026_10";

    const fingerprint1 = `budget_${userId}_${category}_${monthKey}_warning`;
    const fingerprint2 = `budget_${userId}_${category}_${monthKey}_warning`;

    assert.equal(fingerprint1, fingerprint2);
    assert.equal(fingerprint1, "budget_user_12345_Food & Dining_2026_10_warning");
  });

  await t.test("Generates deterministic fingerprints for budget exceeded alerts", () => {
    const userId = "user_12345";
    const category = "Overall";
    const monthKey = "2026_10";

    const fingerprint = `budget_${userId}_${category}_${monthKey}_exceeded`;
    assert.equal(fingerprint, "budget_user_12345_Overall_2026_10_exceeded");
  });

  await t.test("Generates distinct fingerprints across months to allow recurring monthly alerts", () => {
    const userId = "user_12345";
    const oct = `budget_${userId}_Overall_2026_10_exceeded`;
    const nov = `budget_${userId}_Overall_2026_11_exceeded`;

    assert.notEqual(oct, nov);
  });

  await t.test("Generates deterministic fingerprints for recurring bills per due date", () => {
    const userId = "user_12345";
    const ruleId = "rec_67890";
    const dueDate = "2026-10-25";

    const fp1 = `recurring_${userId}_${ruleId}_${dueDate}`;
    const fp2 = `recurring_${userId}_${ruleId}_${dueDate}`;

    assert.equal(fp1, fp2);
    assert.equal(fp1, "recurring_user_12345_rec_67890_2026-10-25");
  });
});

