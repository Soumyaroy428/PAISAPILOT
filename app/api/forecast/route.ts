import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { ForecastQuerySchema } from "@/server/models/forecast";
import { generateCashFlowForecast } from "@/server/services/forecast.service";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = {
    horizon: searchParams.get("horizon") || 30,
    scenario: searchParams.get("scenario") || "baseline",
  };

  const validated = ForecastQuerySchema.safeParse(rawQuery);
  if (!validated.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: validated.error.issues[0]?.message || "Invalid forecast query",
        },
      },
      { status: 400 }
    );
  }

  try {
    const forecast = await generateCashFlowForecast(
      user.userId,
      validated.data.horizon as any,
      validated.data.scenario as any
    );

    return NextResponse.json({ data: { forecast } });
  } catch (error: any) {
    console.error("Failed to generate cash flow forecast:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to compute cash-flow forecast. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
