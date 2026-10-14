import test from "node:test";
import assert from "node:assert/strict";
import { parsePhonePeText } from "../server/lib/parsers/phonepe-pdf.parser";
import { normalizeBankDate } from "../server/lib/parsers/csv.parser";

const SAMPLE_PHONEPE_TEXT = `
Transaction Statement for 6295804018
14 Sept, 2026 - 14 Oct, 2026
Date Transaction Details Type Amount
Oct 11, 2026
08:07 pm
Paid to BERESTA DEBIT ₹290
Transaction ID T2610112007015494772099
UTR No. 934096984301
Paid by XXXXXX7286
Oct 11, 2026
07:32 pm
Received from ******6544 CREDIT ₹170
Transaction ID T2610111932493410933941
UTR No. 516839351928
Credited to XXXXXX3716
Oct 11, 2026
06:50 pm
Received from Hitendra Mandal Rkm CREDIT ₹70
Transaction ID T2610111850131189217301
UTR No. 884490852315
Credited to XXXXXX7286
Oct 10, 2026
06:57 pm
Paid to Blinkit DEBIT ₹165
Transaction ID T2610101857209771710450
UTR No. 203363603810
Paid by XXXXXX3716
Oct 06, 2026
10:43 am
Paid to DEBIT ₹3,700
RAMAKRISHNA MISSION CALCUTTA STUDENTS
HOME
Transaction ID T2610061043211281836050
UTR No. 973117646276
Paid by XXXXXX7286
Sept 30, 2026
01:05 pm
Paid to IRCTC Rail APP DEBIT ₹1,274.5
Transaction ID T2609301305224064907490
UTR No. 445888813016
Paid by XXXXXX7286
Sept 27, 2026
12:09 pm
Paid to Maa DEBIT ₹25,000
Transaction ID T2609271209407476256974
UTR No. 926633485958
Paid by XXXXXX7286
Sept 24, 2026
07:52 pm
Transfer to XXXXXX7286 DEBIT ₹121
Transaction ID T2609241952287754042096
UTR No. 395058273058
Paid by XXXXXXXXXX4018
Page 1 of 9
This is a system generated statement. For any queries, contact us at https://support.phonepe.com/statement.
`;

test("PhonePe Statement Parser", async (t) => {
  await t.test("normalizes PhonePe dates including 'Sept 30, 2026' and 'Oct 11, 2026'", () => {
    assert.equal(normalizeBankDate("Oct 11, 2026"), "2026-10-11");
    assert.equal(normalizeBankDate("Sept 30, 2026"), "2026-09-30");
    assert.equal(normalizeBankDate("Sept 24, 2026"), "2026-09-24");
  });

  await t.test("parses PhonePe debit and credit rows accurately", () => {
    const rows = parsePhonePeText(SAMPLE_PHONEPE_TEXT);
    assert.equal(rows.length, 8);

    // Row 1: Paid to BERESTA ₹290 Debit
    assert.equal(rows[0].transactionDate, "2026-10-11");
    assert.equal(rows[0].type, "expense");
    assert.equal(rows[0].amountPaise, 29000);
    assert.equal(rows[0].description, "Paid to BERESTA");
    assert.equal(rows[0].referenceNo, "T2610112007015494772099");
    assert.equal(rows[0].isValid, true);

    // Row 2: Received from ******6544 ₹170 Credit
    assert.equal(rows[1].transactionDate, "2026-10-11");
    assert.equal(rows[1].type, "income");
    assert.equal(rows[1].amountPaise, 17000);
    assert.equal(rows[1].description, "Received from ******6544");
    assert.equal(rows[1].referenceNo, "T2610111932493410933941");
    assert.equal(rows[1].isValid, true);

    // Row 3: Received from Hitendra Mandal Rkm ₹70 Credit
    assert.equal(rows[2].type, "income");
    assert.equal(rows[2].amountPaise, 7000);

    // Row 4: Paid to Blinkit ₹165 Debit
    assert.equal(rows[3].type, "expense");
    assert.equal(rows[3].amountPaise, 16500);
    assert.equal(rows[3].description, "Paid to Blinkit");

    // Row 5: Multi-line description (Ramakrishna Mission)
    assert.equal(rows[4].amountPaise, 370000);
    assert.equal(rows[4].type, "expense");
    assert.equal(rows[4].description.includes("RAMAKRISHNA MISSION"), true);

    // Row 6: Decimal amount ₹1,274.5
    assert.equal(rows[5].transactionDate, "2026-09-30");
    assert.equal(rows[5].amountPaise, 127450); // ₹1,274.50 = 127450 paise
    assert.equal(rows[5].description, "Paid to IRCTC Rail APP");

    // Row 7: Large amount ₹25,000
    assert.equal(rows[6].amountPaise, 2500000);
    assert.equal(rows[6].description, "Paid to Maa");

    // Row 8: Transfer
    assert.equal(rows[7].amountPaise, 12100);
    assert.equal(rows[7].description, "Transfer to XXXXXX7286");
  });
});
