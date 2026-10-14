import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBankDate,
  parseCurrencyToPaise,
  parseStatementCsv,
} from "../server/lib/parsers/csv.parser";
import {
  computeContentHash,
  computeRowFingerprint,
} from "../server/services/import.service";

describe("Bank Date Normalization", () => {
  test("normalizes DD/MM/YYYY and DD-MM-YYYY formats", () => {
    assert.equal(normalizeBankDate("14/10/2026"), "2026-10-14");
    assert.equal(normalizeBankDate("01-05-2026"), "2026-05-01");
    assert.equal(normalizeBankDate("9/8/2026"), "2026-08-09");
  });

  test("normalizes DD Mon YYYY formats commonly used in SBI e-statements", () => {
    assert.equal(normalizeBankDate("14 Oct 2026"), "2026-10-14");
    assert.equal(normalizeBankDate("02-Jan-2026"), "2026-01-02");
    assert.equal(normalizeBankDate("15-aug-2026"), "2026-08-15");
  });

  test("preserves valid ISO YYYY-MM-DD format", () => {
    assert.equal(normalizeBankDate("2026-10-14"), "2026-10-14");
  });

  test("returns null for unparseable dates without throwing", () => {
    assert.equal(normalizeBankDate("invalid-date-string"), null);
    assert.equal(normalizeBankDate(""), null);
  });
});

describe("Indian Currency Parsing to Exact Integer Paise", () => {
  test("parses standard decimal amounts with commas to integer paise", () => {
    assert.equal(parseCurrencyToPaise("1,500.50"), 150050);
    assert.equal(parseCurrencyToPaise("450.00"), 45000);
    assert.equal(parseCurrencyToPaise("0.75"), 75);
  });

  test("parses Indian numbering grouping (lakhs/crores) with rupee symbol", () => {
    assert.equal(parseCurrencyToPaise("₹ 1,25,000.00"), 12500000);
    assert.equal(parseCurrencyToPaise("₹10,50,000.50"), 105000050);
  });

  test("parses banking suffix notations like Dr/Cr", () => {
    assert.equal(parseCurrencyToPaise("500.00 Dr"), 50000);
    assert.equal(parseCurrencyToPaise("12,000.00 Cr"), 1200000);
  });

  test("handles empty or invalid currency strings gracefully", () => {
    assert.equal(parseCurrencyToPaise(""), 0);
    assert.equal(parseCurrencyToPaise("N/A"), 0);
  });
});

describe("CSV Statement Parsing Engine", () => {
  test("parses representative Indian bank CSV with separate Debit and Credit columns", () => {
    const csvContent = `
Account Statement for 50100234567890
Date,Narration,Chq/Ref No,Withdrawal (Dr),Deposit (Cr),Balance
14/10/2026,UPI-SWIGGY-BANGALORE,UPI123456,450.50,,12050.00
13/10/2026,SALARY CREDIT FROM ACME CORP,SAL98765,,75000.00,12500.50
12/10/2026,NETFLIX SUBSCRIPTION,NFT999,649.00,,37499.50
    `.trim();

    const rows = parseStatementCsv(csvContent);
    assert.equal(rows.length, 3);

    // Row 1: Swiggy expense
    assert.equal(rows[0].transactionDate, "2026-10-14");
    assert.equal(rows[0].type, "expense");
    assert.equal(rows[0].amountPaise, 45050); // ₹450.50
    assert.equal(rows[0].referenceNo, "UPI123456");
    assert.equal(rows[0].isValid, true);

    // Row 2: Salary income
    assert.equal(rows[1].transactionDate, "2026-10-13");
    assert.equal(rows[1].type, "income");
    assert.equal(rows[1].amountPaise, 7500000); // ₹75,000.00
    assert.equal(rows[1].referenceNo, "SAL98765");
    assert.equal(rows[1].isValid, true);

    // Row 3: Netflix expense
    assert.equal(rows[2].transactionDate, "2026-10-12");
    assert.equal(rows[2].type, "expense");
    assert.equal(rows[2].amountPaise, 64900); // ₹649.00
    assert.equal(rows[2].isValid, true);
  });

  test("handles quoted descriptions with embedded commas", () => {
    const csvContent = `
Txn Date,Description,Debit,Credit
14/10/2026,"ZOMATO, RESTAURANT ORDER #4910",350.00,
    `.trim();

    const rows = parseStatementCsv(csvContent);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].description, "ZOMATO, RESTAURANT ORDER #4910");
    assert.equal(rows[0].amountPaise, 35000);
    assert.equal(rows[0].type, "expense");
  });

  test("flags malformed lines with missing amounts or unparseable dates", () => {
    const malformedCsv = `
Date,Narration,Debit,Credit
bad-date,Uber ride,150.00,
14/10/2026,Zero amount,,
    `.trim();

    const rows = parseStatementCsv(malformedCsv);
    assert.equal(rows.length, 2);

    assert.equal(rows[0].isValid, false);
    assert.match(rows[0].error!, /Unparseable/);

    assert.equal(rows[1].isValid, false);
    assert.match(rows[1].error!, /Missing or zero/);
  });
});

describe("Deduplication & Fingerprint Stability", () => {
  test("generates stable content hash for uploaded files", () => {
    const buffer1 = Buffer.from("Date,Narration,Debit\n14/10/2026,Coffee,120.00");
    const buffer2 = Buffer.from("Date,Narration,Debit\n14/10/2026,Coffee,120.00");
    const buffer3 = Buffer.from("Different content");

    assert.equal(computeContentHash(buffer1), computeContentHash(buffer2));
    assert.notEqual(computeContentHash(buffer1), computeContentHash(buffer3));
  });

  test("row fingerprint is invariant to variable time stamps and spacing", () => {
    const fp1 = computeRowFingerprint(
      "user_123",
      "2026-10-14",
      45000,
      "Swiggy at 14:32:10 Bangalore",
      "REF123"
    );
    const fp2 = computeRowFingerprint(
      "user_123",
      "2026-10-14",
      45000,
      "Swiggy at 18:05:00 Bangalore",
      "REF123"
    );

    // Strips variable time to match transactions
    assert.equal(fp1, fp2);
  });
});

