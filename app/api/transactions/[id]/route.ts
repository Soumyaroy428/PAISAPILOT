import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import {
  getTransactionById,
  deleteTransaction,
} from "@/server/services/transaction.service";

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
  const transaction = await getTransactionById(user.userId, id);

  if (!transaction) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Transaction not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { transaction } });
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
  const success = await deleteTransaction(user.userId, id);

  if (!success) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Transaction not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: { message: "Transaction deleted and account balance updated." },
  });
}

