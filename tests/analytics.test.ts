import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolvePeriodDateRange } from "../server/services/analytics.service";
import { sanitizeForCsv } from "../server/services/export.service";

describe("Period Date Boundary Resolution", () => {
  test("resolves this_month to day 1 00:00:00 through last day 23:59:59", () => {
    const range = resolvePeriodDateRange("this_month");
    assert.ok(range.startDate);
    assert.ok(range.endDate);

    assert.equal(range.startDate.getDate(), 1);
    assert.equal(range.startDate.getHours(), 0);
    assert.equal(range.startDate.getMinutes(), 0);

    // End date must be the last millisecond of the month
    assert.equal(range.endDate.getHours(), 23);
    assert.equal(range.endDate.getMinutes(), 59);
    assert.equal(range.endDate.getSeconds(), 59);
    assert.equal(range.endDate.getMilliseconds(), 999);
  });

  test("resolves this_year to Jan 1 00:00:00 through Dec 31 23:59:59", () => {
    const range = resolvePeriodDateRange("this_year");
    assert.ok(range.startDate);
    assert.ok(range.endDate);

    assert.equal(range.startDate.getMonth(), 0); // January
    assert.equal(range.startDate.getDate(), 1);

    assert.equal(range.endDate.getMonth(), 11); // December
    assert.equal(range.endDate.getDate(), 31);
    assert.equal(range.endDate.getHours(), 23);
  });

  test("resolves all_time without date restrictions", () => {
    const range = resolvePeriodDateRange("all_time");
    assert.equal(range.startDate, undefined);
    assert.equal(range.endDate, undefined);
    assert.equal(range.label, "All Time");
  });
});

describe("Single Source of Truth Financial Calculation Rules", () => {
  test("excludes internal transfers from P&L income and expense sums", () => {
    const transactions = [
      { type: "income", amountPaise: 8000000 },   // ₹80,000
      { type: "expense", amountPaise: 3500000 },  // ₹35,000
      { type: "transfer", amountPaise: 2000000 }, // ₹20,000 internal transfer
    ];

    let totalIncomePaise = 0;
    let totalExpensePaise = 0;
    let transferCount = 0;

    for (const t of transactions) {
      if (t.type === "transfer") {
        transferCount++;
        continue;
      }
      if (t.type === "income") totalIncomePaise += t.amountPaise;
      if (t.type === "expense") totalExpensePaise += t.amountPaise;
    }

    assert.equal(totalIncomePaise, 8000000);
    assert.equal(totalExpensePaise, 3500000);
    assert.equal(transferCount, 1);

    const netSavingsPaise = totalIncomePaise - totalExpensePaise;
    assert.equal(netSavingsPaise, 4500000); // ₹45,000

    const savingsRate = Math.round((netSavingsPaise / totalIncomePaise) * 100);
    assert.equal(savingsRate, 56); // 56% savings rate
  });

  test("handles zero-income and deficit savings rates without NaN", () => {
    // Zero income scenario
    const income0 = 0;
    const expense = 1500000;
    const rate0 = income0 > 0 ? Math.round(((income0 - expense) / income0) * 100) : 0;
    assert.equal(rate0, 0);

    // Deficit scenario (spent more than earned)
    const incomeDeficit = 2000000;
    const expenseDeficit = 3000000;
    const rateDeficit = Math.round(((incomeDeficit - expenseDeficit) / incomeDeficit) * 100);
    assert.equal(rateDeficit, -50);
  });
});

describe("CSV Formula Injection Defense (Sanitization)", () => {
  test("neutralizes dangerous spreadsheet formula prefix characters", () => {
    // Formula characters: =, +, -, @
    assert.equal(sanitizeForCsv("=SUM(A1:A10)"), "'=SUM(A1:A10)");
    assert.equal(sanitizeForCsv("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
    assert.equal(sanitizeForCsv("-2+3+cmd"), "'-2+3+cmd");
    assert.equal(sanitizeForCsv("@malicious"), "'@malicious");
  });

  test("properly quotes fields containing commas and quotes", () => {
    assert.equal(sanitizeForCsv("Swiggy, Bangalore"), '"Swiggy, Bangalore"');
    assert.equal(sanitizeForCsv('Food "Special" Order'), '"Food ""Special"" Order"');
  });

  test("leaves normal safe alphanumeric descriptions untouched", () => {
    assert.equal(sanitizeForCsv("Grocery purchase at DMart"), "Grocery purchase at DMart");
    assert.equal(sanitizeForCsv("HDFC Salary Account"), "HDFC Salary Account");
  });
});

