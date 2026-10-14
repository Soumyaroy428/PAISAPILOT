import test from "node:test";
import assert from "node:assert/strict";
import {
  matchDeterministicCategory,
  INDIAN_MERCHANT_RULES,
} from "../server/services/categorization.service";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "../server/models/category";

test("Categorization Service - Deterministic Indian Merchant Rules", async (t) => {
  await t.test("matches Food & Dining merchants accurately", () => {
    const swiggy = matchDeterministicCategory("UPI/SWIGGY/123456/Order payment");
    assert.equal(swiggy.categoryName, "Food & Dining");
    assert.equal(swiggy.isMatched, true);
    assert.equal(swiggy.confidence, 0.95);

    const zomato = matchDeterministicCategory("POS ZOMATO RESTAURANT GURGAON");
    assert.equal(zomato.categoryName, "Food & Dining");
    assert.equal(zomato.isMatched, true);

    const dominos = matchDeterministicCategory("DOMINOS PIZZA ONLINE");
    assert.equal(dominos.categoryName, "Food & Dining");
    assert.equal(dominos.isMatched, true);
  });

  await t.test("matches Groceries & Quick Commerce merchants", () => {
    const blinkit = matchDeterministicCategory("UPI/Blinkit Commerce Pvt Ltd/987654");
    assert.equal(blinkit.categoryName, "Groceries");
    assert.equal(blinkit.isMatched, true);

    const zepto = matchDeterministicCategory("ZEPTO INSTANT DELIVERY");
    assert.equal(zepto.categoryName, "Groceries");
    assert.equal(zepto.isMatched, true);

    const dmart = matchDeterministicCategory("AVENUE SUPERMARTS DMART STORE");
    assert.equal(dmart.categoryName, "Groceries");
    assert.equal(dmart.isMatched, true);
  });

  await t.test("matches Transport & Commute narrations", () => {
    const uber = matchDeterministicCategory("UBER INDIA RIDES PVT LTD");
    assert.equal(uber.categoryName, "Transport");
    assert.equal(uber.isMatched, true);

    const ola = matchDeterministicCategory("OLA CABS RIDE PAYMENT");
    assert.equal(ola.categoryName, "Transport");
    assert.equal(ola.isMatched, true);

    const irctc = matchDeterministicCategory("IRCTC TICKET BOOKING NEW DELHI");
    assert.equal(irctc.categoryName, "Transport");
    assert.equal(irctc.isMatched, true);

    const fastag = matchDeterministicCategory("NETC FASTAG RECHARGE ICICI");
    assert.equal(fastag.categoryName, "Transport");
    assert.equal(fastag.isMatched, true);
  });

  await t.test("matches Shopping & E-Commerce merchants", () => {
    const amazon = matchDeterministicCategory("AMAZON PAY INDIA PVT LTD");
    assert.equal(amazon.categoryName, "Shopping");
    assert.equal(amazon.isMatched, true);

    const flipkart = matchDeterministicCategory("FLIPKART INTERNET PAYMENT");
    assert.equal(flipkart.categoryName, "Shopping");
    assert.equal(flipkart.isMatched, true);

    const myntra = matchDeterministicCategory("MYNTRA DESIGNS BANGALORE");
    assert.equal(myntra.categoryName, "Shopping");
    assert.equal(myntra.isMatched, true);
  });

  await t.test("matches Bills & Utilities narrations", () => {
    const bescom = matchDeterministicCategory("BESCOM ELECTRICITY BILL BANGALORE");
    assert.equal(bescom.categoryName, "Bills & Utilities");
    assert.equal(bescom.isMatched, true);

    const jio = matchDeterministicCategory("RELIANCE JIO PREPAID RECHARGE");
    assert.equal(jio.categoryName, "Bills & Utilities");
    assert.equal(jio.isMatched, true);

    const act = matchDeterministicCategory("ACT FIBERNET INTERNET BILL");
    assert.equal(act.categoryName, "Bills & Utilities");
    assert.equal(act.isMatched, true);
  });

  await t.test("matches Housing & Rent narrations", () => {
    const rent = matchDeterministicCategory("House rent transfer for October");
    assert.equal(rent.categoryName, "Housing & Rent");
    assert.equal(rent.isMatched, true);

    const nobroker = matchDeterministicCategory("NOBROKER PAY RENT DUES");
    assert.equal(nobroker.categoryName, "Housing & Rent");
    assert.equal(nobroker.isMatched, true);
  });

  await t.test("matches Entertainment & Subscriptions narrations", () => {
    const netflix = matchDeterministicCategory("NETFLIX ENTERTAINMENT SVCS");
    assert.equal(netflix.categoryName, "Entertainment");
    assert.equal(netflix.isMatched, true);

    const spotify = matchDeterministicCategory("SPOTIFY AB RECURRING SUB");
    assert.equal(spotify.categoryName, "Entertainment");
    assert.equal(spotify.isMatched, true);

    const bookmyshow = matchDeterministicCategory("BOOKMYSHOW BIGTREE ENTERTAINMENT");
    assert.equal(bookmyshow.categoryName, "Entertainment");
    assert.equal(bookmyshow.isMatched, true);
  });

  await t.test("matches Healthcare & Pharmacy narrations", () => {
    const apollo = matchDeterministicCategory("APOLLO PHARMACY BANGALORE");
    assert.equal(apollo.categoryName, "Healthcare");
    assert.equal(apollo.isMatched, true);

    const pharmeasy = matchDeterministicCategory("PHARMEASY MEDICINE PURCHASE");
    assert.equal(pharmeasy.categoryName, "Healthcare");
    assert.equal(pharmeasy.isMatched, true);
  });

  await t.test("matches Investments & Savings narrations", () => {
    const zerodha = matchDeterministicCategory("ZERODHA BROKING LTD FUNDS ADD");
    assert.equal(zerodha.categoryName, "Investments");
    assert.equal(zerodha.isMatched, true);

    const groww = matchDeterministicCategory("GROWW MUTUAL FUND SIP DEDUCTION");
    assert.equal(groww.categoryName, "Investments");
    assert.equal(groww.isMatched, true);
  });

  await t.test("matches Education & Learning narrations", () => {
    const udemy = matchDeterministicCategory("UDEMY ONLINE COURSE PAYMENT");
    assert.equal(udemy.categoryName, "Education");
    assert.equal(udemy.isMatched, true);
  });

  await t.test("matches Salary & Primary Inflow accurately", () => {
    const salary = matchDeterministicCategory(
      "SALARY CREDIT FOR SEPTEMBER ACME CORP",
      "income"
    );
    assert.equal(salary.categoryName, "Salary & Income");
    assert.equal(salary.isMatched, true);

    const clientFee = matchDeterministicCategory(
      "Client invoice payment for engineering audit",
      "income"
    );
    assert.equal(clientFee.categoryName, "Salary & Income");
    assert.equal(clientFee.isMatched, true);
  });

  await t.test("assigns Transfer category for inter-account transfers", () => {
    const transfer = matchDeterministicCategory("Self transfer to HDFC", "transfer");
    assert.equal(transfer.categoryName, "Transfer");
    assert.equal(transfer.confidence, 1.0);
    assert.equal(transfer.isMatched, true);
  });

  await t.test("falls back cleanly to Uncategorized for unrecognized narrations", () => {
    const unknown = matchDeterministicCategory("SOME RANDOM MERCHANT 9872163");
    assert.equal(unknown.categoryName, "Uncategorized");
    assert.equal(unknown.isMatched, false);
    assert.equal(unknown.source, "fallback");

    const empty = matchDeterministicCategory("");
    assert.equal(empty.categoryName, "Uncategorized");
    assert.equal(empty.isMatched, false);
  });
});

test("Category Model - Zod Schemas Validation", async (t) => {
  await t.test("validates valid category creation input", () => {
    const valid = CreateCategorySchema.safeParse({
      name: "Gym & Fitness",
      kind: "expense",
      color: "#f97316",
    });
    assert.equal(valid.success, true);
  });

  await t.test("rejects invalid hex color code", () => {
    const invalidColor = CreateCategorySchema.safeParse({
      name: "Gym & Fitness",
      kind: "expense",
      color: "red-invalid",
    });
    assert.equal(invalidColor.success, false);
  });

  await t.test("rejects empty category name", () => {
    const emptyName = CreateCategorySchema.safeParse({
      name: "   ",
      kind: "expense",
    });
    assert.equal(emptyName.success, false);
  });

  await t.test("rejects overly long category name (>50 chars)", () => {
    const longName = CreateCategorySchema.safeParse({
      name: "A".repeat(51),
      kind: "expense",
    });
    assert.equal(longName.success, false);
  });

  await t.test("validates partial category update schema", () => {
    const validUpdate = UpdateCategorySchema.safeParse({
      name: "Updated Category",
      color: "#10b981",
    });
    assert.equal(validUpdate.success, true);
  });
});
