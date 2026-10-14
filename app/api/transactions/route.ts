import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import {
  CreateTransactionSchema,
  TransactionQuerySchema,
} from "@/server/models/transaction";
import {
  getTransactions,
  createTransaction,
} from "@/server/services/transaction.service";

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
    const queryObj: Record<string, string> = {};

    searchParams.forEach((val, key) => {
      queryObj[key] = val;
    });

    const validated = TransactionQuerySchema.safeParse(queryObj);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid query parameters.",
          },
        },
        { status: 400 }
      );
    }

    const result = await getTransactions(user.userId, validated.data);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Failed to query transactions:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to retrieve transactions." } },
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
    const validated = CreateTransactionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid transaction input.",
          },
        },
        { status: 400 }
      );
    }

    const transaction = await createTransaction(user.userId, validated.data);
    return NextResponse.json({ data: { transaction } }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create transaction:", error);
    return NextResponse.json(
      { error: { code: "OPERATION_FAILED", message: error.message || "Failed to create transaction." } },
      { status: 400 }
    );
  }
}

