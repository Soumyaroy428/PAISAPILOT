import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { getBankConnectionStatus } from "@/server/services/bank-sync/bank-sync.service";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const status = await getBankConnectionStatus(user.userId);
    return NextResponse.json({ data: status });
  } catch (error: any) {
    console.error("Failed to query bank connection status:", error);
    return NextResponse.json(
      {
        error: {
          code: "STATUS_QUERY_FAILED",
          message: "Failed to retrieve bank connection status.",
        },
      },
      { status: 500 }
    );
  }
}

