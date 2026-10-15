import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { DisconnectBankSchema } from "@/server/models/bank-connection";
import { disconnectBankConnection } from "@/server/services/bank-sync/bank-sync.service";

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
    const validated = DisconnectBankSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid disconnect request payload.",
          },
        },
        { status: 400 }
      );
    }

    const result = await disconnectBankConnection(user.userId, validated.data.connectionId);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Bank disconnect failed:", error?.message || error);
    return NextResponse.json(
      {
        error: {
          code: "DISCONNECT_FAILED",
          message: error?.message || "Failed to disconnect bank account.",
        },
      },
      { status: 500 }
    );
  }
}

