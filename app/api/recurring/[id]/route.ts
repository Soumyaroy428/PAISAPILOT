import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { UpdateRecurringSchema } from "@/server/models/recurring";
import { updateRecurringRule } from "@/server/services/recurring.service";

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
    const validated = UpdateRecurringSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid update data.",
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateRecurringRule(user.userId, id, validated.data);
    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Recurring rule not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { rule: updated } });
  } catch (error: any) {
    console.error("Failed to update recurring rule:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update recurring rule." } },
      { status: 500 }
    );
  }
}
