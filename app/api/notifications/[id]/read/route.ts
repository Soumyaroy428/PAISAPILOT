import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/server/services/notification.service";

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
    if (id === "all") {
      await markAllNotificationsRead(user.userId);
      return NextResponse.json({ data: { message: "All notifications marked as read." } });
    }

    const success = await markNotificationRead(user.userId, id);
    if (!success) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Notification not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { message: "Notification marked as read." } });
  } catch (error: any) {
    console.error("Failed to mark notification read:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to mark notification read." } },
      { status: 500 }
    );
  }
}
