import { z } from "zod";

export type ForecastHorizon = 30 | 60 | 90;
export type ForecastScenario = "baseline" | "conservative" | "optimistic";
export type ForecastConfidence = "high" | "moderate" | "low";

export interface ForecastDailyPoint {
  date: string; // YYYY-MM-DD
  dayIndex: number;
  baselinePaise: number;
  conservativePaise: number;
  optimisticPaise: number;
  scheduledEvents: string[];
}

export interface CashFlowForecastResult {
  horizonDays: ForecastHorizon;
  selectedScenario: ForecastScenario;
  confidence: ForecastConfidence;
  isLowDataState: boolean;
  dataPointsAnalyzed: number;
  historicalDaysAnalyzed: number;
  startingBalancePaise: number;
  scenarios: {
    baseline: {
      endBalancePaise: number;
      netChangePaise: number;
    };
    conservative: {
      endBalancePaise: number;
      netChangePaise: number;
    };
    optimistic: {
      endBalancePaise: number;
      netChangePaise: number;
    };
  };
  metrics: {
    dailyVariableBurnPaise: number;
    totalScheduledBillsPaise: number;
    totalExpectedInflowPaise: number;
    lowestPoint: {
      date: string;
      balancePaise: number;
    };
    runwayDays: number | null; // null if cash flow positive
  };
  trajectory: ForecastDailyPoint[];
  assumptions: string[];
  disclaimer: string;
}

export const ForecastQuerySchema = z.object({
  horizon: z.coerce.number().refine((val) => [30, 60, 90].includes(val), {
    message: "Horizon must be 30, 60, or 90 days",
  }).default(30),
  scenario: z.enum(["baseline", "conservative", "optimistic"]).default("baseline"),
});

export type ForecastQueryInput = z.infer<typeof ForecastQuerySchema>;

