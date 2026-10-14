import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { CreateRecurringSchema } from "@/server/models/recurring";
import {
  getRecurringRules,
  getUpcomingBills,
  createRecurringRule,
} from "@/server/services/recurring.service";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const [rules, upcoming] = await Promise.all([
      getRecurringRules(user.userId),
      getUpcomingBills(user.userId, 15),
    ]);

    return NextResponse.json({
      data: {
        rules,
        upcomingBills: upcoming.bills,
        totalUpcomingDuePaise: upcoming.totalDuePaise,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch recurring rules:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch recurring rules." } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validated = CreateRecurringSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid payload.",
          },
        },
        { status: 400 }
      );
    }

    const rule = await createRecurringRule(user.userId, validated.data);
    return NextResponse.json({ data: { rule } }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create recurring rule:", error);
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: error.message || "Failed to create recurring rule." } },
      { status: 400 }
    );
  }
}

