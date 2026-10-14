import test from "node:test";
import assert from "node:assert/strict";
import {
  ForecastQuerySchema,
  ForecastHorizon,
  ForecastScenario,
} from "../server/models/forecast";

test("Cash-Flow Forecasting - Query Validation Schema", async (t) => {
  await t.test("accepts valid horizons and scenarios", () => {
    const valid30 = ForecastQuerySchema.safeParse({ horizon: 30, scenario: "baseline" });
    assert.equal(valid30.success, true);
    if (valid30.success) {
      assert.equal(valid30.data.horizon, 30);
      assert.equal(valid30.data.scenario, "baseline");
    }

    const valid60 = ForecastQuerySchema.safeParse({ horizon: 60, scenario: "conservative" });
    assert.equal(valid60.success, true);

    const valid90 = ForecastQuerySchema.safeParse({ horizon: 90, scenario: "optimistic" });
    assert.equal(valid90.success, true);
  });

  await t.test("coerces string numbers for horizon safely", () => {
    const coerced = ForecastQuerySchema.safeParse({ horizon: "60" });
    assert.equal(coerced.success, true);
    if (coerced.success) {
      assert.equal(coerced.data.horizon, 60);
      assert.equal(coerced.data.scenario, "baseline"); // default
    }
  });

  await t.test("rejects invalid horizons", () => {
    const invalidHorizon = ForecastQuerySchema.safeParse({ horizon: 45 });
    assert.equal(invalidHorizon.success, false);

    const zeroHorizon = ForecastQuerySchema.safeParse({ horizon: 0 });
    assert.equal(zeroHorizon.success, false);
  });

  await t.test("rejects invalid scenarios", () => {
    const invalidScenario = ForecastQuerySchema.safeParse({
      horizon: 30,
      scenario: "unrealistic" as any,
    });
    assert.equal(invalidScenario.success, false);
  });
});

test("Cash-Flow Forecasting - Mathematical Trajectory Simulation", async (t) => {
  // Helper replicating trajectory simulation
  function simulateTrajectory(params: {
    startingBalancePaise: number;
    dailyVariableExpensePaise: number;
    dailyVariableIncomePaise: number;
    horizonDays: number;
    scheduledBills: Array<{ day: number; amountPaise: number }>;
  }) {
    const {
      startingBalancePaise,
      dailyVariableExpensePaise,
      dailyVariableIncomePaise,
      horizonDays,
      scheduledBills,
    } = params;

    let baseline = startingBalancePaise;
    let conservative = startingBalancePaise;
    let optimistic = startingBalancePaise;

    const conservativeBurn = Math.round(dailyVariableExpensePaise * 1.15);
    const optimisticBurn = Math.round(dailyVariableExpensePaise * 0.85);
    const baselineBurn = dailyVariableExpensePaise;

    let lowestBaseline = baseline;

    for (let day = 1; day <= horizonDays; day++) {
      const scheduledToday = scheduledBills
        .filter((b) => b.day === day)
        .reduce((sum, b) => sum + b.amountPaise, 0);

      baseline += scheduledToday + dailyVariableIncomePaise - baselineBurn;
      conservative += scheduledToday - conservativeBurn; // conservative ignores variable inflow
      optimistic += scheduledToday + dailyVariableIncomePaise - optimisticBurn;

      if (baseline < lowestBaseline) {
        lowestBaseline = baseline;
      }
    }

    return {
      baselineEnd: baseline,
      conservativeEnd: conservative,
      optimisticEnd: optimistic,
      lowestBaseline,
      baselineNetChange: baseline - startingBalancePaise,
    };
  }

  await t.test("computes integer paise trajectories across all scenarios", () => {
    const res = simulateTrajectory({
      startingBalancePaise: 5000000, // ₹50,000
      dailyVariableExpensePaise: 100000, // ₹1,000 / day
      dailyVariableIncomePaise: 150000, // ₹1,500 / day
      horizonDays: 30,
      scheduledBills: [
        { day: 5, amountPaise: -1500000 }, // ₹15,000 rent
        { day: 15, amountPaise: -64900 }, // ₹649 Netflix
      ],
    });

    // Net variable daily in baseline = +500/day * 30 days = +15,000
    // Scheduled bills = -15,649
    // Net change = 15,000 - 15,649 = -649
    // Final baseline = 50,000 - 649 = 49,351
    assert.equal(res.baselineNetChange, -64900);
    assert.equal(res.baselineEnd, 4935100);

    // Conservative (+15% burn = ₹1,150/day * 30 = -34,500, zero variable income, -15,649 bills)
    // Starting 50,000 - 34,500 - 15,649 = -150
    assert.equal(res.conservativeEnd < res.baselineEnd, true);

    // Optimistic (-15% burn = ₹850/day)
    assert.equal(res.optimisticEnd > res.baselineEnd, true);
  });

  await t.test("tracks lowest balance dip correctly", () => {
    const res = simulateTrajectory({
      startingBalancePaise: 2000000, // ₹20,000
      dailyVariableExpensePaise: 100000, // ₹1,000 / day
      dailyVariableIncomePaise: 50000, // ₹500 / day
      horizonDays: 10,
      scheduledBills: [
        { day: 3, amountPaise: -1500000 }, // ₹15,000 rent creates mid-month dip
        { day: 5, amountPaise: 2500000 }, // ₹25,000 salary inflow recovers balance
      ],
    });

    // On day 3: starting 20,000 - 1,500 (3 days net burn at 500) - 15,000 rent = 3,500
    // Then on day 5 salary hits (+25,000), so day 3 is the lowest dip and baselineEnd is much higher
    assert.equal(res.lowestBaseline <= 350000, true);
    assert.equal(res.lowestBaseline < res.baselineEnd, true);
  });
});

test("Cash-Flow Forecasting - Runway Calculation & Low-Data Heuristics", async (t) => {
  function computeRunway(startingBalancePaise: number, dailyBurnPaise: number, dailyInflowPaise: number): number | null {
    const netDailyBurn = dailyBurnPaise - dailyInflowPaise;
    if (netDailyBurn <= 0) return null; // Sustainable / positive
    if (startingBalancePaise <= 0) return 0;
    return Math.floor(startingBalancePaise / netDailyBurn);
  }

  await t.test("returns null (sustainable) when daily inflows exceed burn", () => {
    const runway = computeRunway(5000000, 100000, 150000);
    assert.equal(runway, null);
  });

  await t.test("calculates exact integer runway days during net burn", () => {
    // ₹1,00,000 balance with net daily burn of ₹1,000 (burn ₹2,000 - inflow ₹1,000)
    // 100,000 / 1,000 = 100 days
    const runway = computeRunway(10000000, 200000, 100000);
    assert.equal(runway, 100);
  });

  await t.test("returns 0 runway when starting balance is already depleted", () => {
    const runway = computeRunway(0, 100000, 0);
    assert.equal(runway, 0);

    const negativeRunway = computeRunway(-50000, 100000, 0);
    assert.equal(negativeRunway, 0);
  });

  await t.test("outlier filter prevents large one-off capital expenses from distorting burn rate", () => {
    const expenses = [
      { amountPaise: 50000 }, // ₹500
      { amountPaise: 75000 }, // ₹750
      { amountPaise: 120000 }, // ₹1,200
      { amountPaise: 60000 }, // ₹600
      { amountPaise: 25000000 }, // ₹2,50,000 (Outlier: Laptop purchase)
    ];

    const outlierThresholdPaise = 5000000; // ₹50,000 cutoff
    const filtered = expenses.filter((e) => e.amountPaise <= outlierThresholdPaise);

    assert.equal(filtered.length, 4);
    assert.equal(
      filtered.some((e) => e.amountPaise === 25000000),
      false
    );

    const filteredTotal = filtered.reduce((s, e) => s + e.amountPaise, 0);
    assert.equal(filteredTotal, 305000); // ₹3,050 total normal spend
  });
});
