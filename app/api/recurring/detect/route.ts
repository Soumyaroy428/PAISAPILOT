import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { detectRecurringCandidates } from "@/server/services/recurring.service";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const result = await detectRecurringCandidates(user.userId);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Failed to detect recurring candidates:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to detect recurring candidates." } },
      { status: 500 }
    );
  }
}

