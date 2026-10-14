import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import {
  getDashboardAnalytics,
  AnalyticsPeriod,
} from "@/server/services/analytics.service";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") as AnalyticsPeriod) || "this_month";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const data = await getDashboardAnalytics(
      user.userId,
      period,
      startDate,
      endDate
    );

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Dashboard analytics error:", error);
    return NextResponse.json(
      {
        error: {
          code: "ANALYTICS_FAILED",
          message: error.message || "Failed to calculate analytics.",
        },
      },
      { status: 500 }
    );
  }
}

