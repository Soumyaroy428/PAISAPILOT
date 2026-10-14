import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { UpdateBudgetSchema } from "@/server/models/budget";
import { updateBudget, archiveBudget } from "@/server/services/budget.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  try {
    const body = await request.json();
    const validated = UpdateBudgetSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid update payload.",
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateBudget(user.userId, id, validated.data);
    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Budget not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { budget: updated } });
  } catch (error: any) {
    console.error("Failed to update budget:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update budget." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const success = await archiveBudget(user.userId, id);

  if (!success) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Budget not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { message: "Budget archived successfully." } });
}

