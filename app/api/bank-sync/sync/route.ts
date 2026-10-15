import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { isBankSyncEnabled } from "@/server/lib/feature-flags";
import { syncBankTransactions } from "@/server/services/bank-sync/bank-sync.service";

const SyncRequestSchema = z.object({
  connectionId: z.string().min(1, "Connection ID is required"),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  if (!isBankSyncEnabled()) {
    return NextResponse.json(
      {
        error: {
          code: "FEATURE_DISABLED",
          message: "Automatic bank transaction synchronization is currently disabled.",
        },
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const validated = SyncRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid sync request.",
          },
        },
        { status: 400 }
      );
    }

    const result = await syncBankTransactions(user.userId, validated.data.connectionId);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Bank transaction sync failed:", error?.message || error);
    return NextResponse.json(
      {
        error: {
          code: "SYNC_FAILED",
          message: error?.message || "Failed to synchronize bank transactions.",
        },
      },
      { status: 500 }
    );
  }
}

