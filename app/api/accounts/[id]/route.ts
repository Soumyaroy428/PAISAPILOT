import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { UpdateAccountSchema } from "@/server/models/account";
import {
  getAccountById,
  updateAccount,
  archiveAccount,
} from "@/server/services/account.service";

export async function GET(
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
  const account = await getAccountById(user.userId, id);

  if (!account) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Account not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { account } });
}

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
    const validated = UpdateAccountSchema.safeParse(body);

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

    const updated = await updateAccount(user.userId, id, validated.data);
    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Account not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { account: updated } });
  } catch (error: any) {
    console.error("Failed to update account:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update account." } },
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
  const success = await archiveAccount(user.userId, id);

  if (!success) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Account not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { message: "Account archived successfully." } });
}

