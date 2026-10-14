import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { autoCategorizeUnassignedTransactions } from "@/server/services/category.service";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const result = await autoCategorizeUnassignedTransactions(user.userId);
    return NextResponse.json({
      data: {
        totalChecked: result.totalChecked,
        totalCategorized: result.totalCategorized,
        categorizedBreakdown: result.categorizedBreakdown,
      },
    });
  } catch (error: any) {
    console.error("Auto-categorization failed:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to run auto-categorization." } },
      { status: 500 }
    );
  }
}
