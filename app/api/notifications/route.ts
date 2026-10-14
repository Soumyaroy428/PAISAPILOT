import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import {
  getNotifications,
  evaluateAndGenerateAlerts,
} from "@/server/services/notification.service";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const data = await getNotifications(user.userId);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch notifications." } },
      { status: 500 }
    );
  }
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const result = await evaluateAndGenerateAlerts(user.userId);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Failed to evaluate notifications:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to evaluate notifications." } },
      { status: 500 }
    );
  }
}
