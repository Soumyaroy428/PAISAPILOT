import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { isBankSyncEnabled } from "@/server/lib/feature-flags";
import { CreateConsentRequestSchema } from "@/server/models/bank-connection";
import { initiateBankConsentFlow } from "@/server/services/bank-sync/bank-sync.service";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  // Non-negotiable discovery gate enforcement
  if (!isBankSyncEnabled()) {
    return NextResponse.json(
      {
        error: {
          code: "DISCOVERY_GATE_ACTIVE",
          message:
            "Bank synchronization is currently disabled pending formal regulatory Account Aggregator FIU registration. Live bank connections cannot be simulated without verified provider configuration.",
        },
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const validated = CreateConsentRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid consent request.",
          },
        },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;
    const result = await initiateBankConsentFlow(user.userId, validated.data, origin);

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Bank consent initiation failed:", error?.message || error);
    return NextResponse.json(
      {
        error: {
          code: "INITIATE_FAILED",
          message: error?.message || "Failed to initiate bank consent authorization.",
        },
      },
      { status: 500 }
    );
  }
}

