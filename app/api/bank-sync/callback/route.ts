import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { ConsentCallbackQuerySchema } from "@/server/models/bank-connection";
import { handleConsentCallback } from "@/server/services/bank-sync/bank-sync.service";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  const url = new URL(request.url);
  const redirectTarget = new URL("/dashboard/settings/bank-connections", url.origin);

  if (!user) {
    const loginRedirect = new URL("/login", url.origin);
    loginRedirect.searchParams.set("redirect", "/dashboard/settings/bank-connections");
    return NextResponse.redirect(loginRedirect);
  }

  const queryParams = {
    state: url.searchParams.get("state") || "",
    consentId: url.searchParams.get("consentId") || "",
    status: url.searchParams.get("status") || "success",
  };

  const validated = ConsentCallbackQuerySchema.safeParse(queryParams);
  if (!validated.success) {
    redirectTarget.searchParams.set("error", "INVALID_CALLBACK_PARAMS");
    return NextResponse.redirect(redirectTarget);
  }

  try {
    const result = await handleConsentCallback(user.userId, validated.data);
    if (result.success) {
      redirectTarget.searchParams.set("status", "connected");
    } else {
      redirectTarget.searchParams.set("status", result.status);
    }
    return NextResponse.redirect(redirectTarget);
  } catch (error: any) {
    console.error("Bank consent callback handling failed:", error?.message || error);
    redirectTarget.searchParams.set("error", error?.message || "CALLBACK_PROCESSING_FAILED");
    return NextResponse.redirect(redirectTarget);
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
    const validated = ConsentCallbackQuerySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid callback parameters.",
          },
        },
        { status: 400 }
      );
    }

    const result = await handleConsentCallback(user.userId, validated.data);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Bank consent callback failed:", error?.message || error);
    return NextResponse.json(
      {
        error: {
          code: "CALLBACK_VERIFICATION_FAILED",
          message: error?.message || "Failed to process consent callback.",
        },
      },
      { status: 400 }
    );
  }
}

