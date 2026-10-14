import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { CreateBudgetSchema } from "@/server/models/budget";
import {
  getBudgetsWithProgress,
  createBudget,
} from "@/server/services/budget.service";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const budgets = await getBudgetsWithProgress(user.userId);
    return NextResponse.json({ data: { budgets } });
  } catch (error: any) {
    console.error("Failed to fetch budgets:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch budgets." } },
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
    const validated = CreateBudgetSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid budget payload.",
          },
        },
        { status: 400 }
      );
    }

    const budget = await createBudget(user.userId, validated.data);
    return NextResponse.json({ data: { budget } }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create budget:", error);
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: error.message || "Failed to create budget." } },
      { status: 400 }
    );
  }
}

