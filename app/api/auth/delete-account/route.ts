import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { deleteUserAccountPermanently } from "@/server/services/user-deletion.service";
import { rateLimiter, getClientIp } from "@/server/lib/rate-limiter";
import { z } from "zod";

const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required for confirmation"),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = rateLimiter.check(`del_acc_${ip}`, 5, 15 * 60 * 1000); // 5 attempts per 15 mins

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many deletion attempts. Please wait 15 minutes and try again.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.resetMs / 1000)),
        },
      }
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validated = DeleteAccountSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid input",
          },
        },
        { status: 400 }
      );
    }

    const result = await deleteUserAccountPermanently(user.userId, validated.data.password);

    return NextResponse.json({
      data: {
        success: true,
        message: "Your account and all financial data have been permanently wiped.",
        deletedCounts: result.deletedCounts,
      },
    });
  } catch (error: any) {
    console.error("Account deletion failed:", error.message);
    const isAuthError = error.message.includes("Incorrect password");
    return NextResponse.json(
      {
        error: {
          code: isAuthError ? "INVALID_CREDENTIALS" : "INTERNAL_ERROR",
          message: error.message || "Failed to delete account. Please try again.",
        },
      },
      { status: isAuthError ? 403 : 500 }
    );
  }
}

