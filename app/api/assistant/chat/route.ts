import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { AssistantQuerySchema } from "@/server/models/assistant";
import { askAssistant } from "@/server/services/ai-gateway.service";
import { rateLimiter } from "@/server/lib/rate-limiter";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required to use AI Assistant." } },
      { status: 401 }
    );
  }

  const rateLimit = rateLimiter.check(`ai_${user.userId}`, 20, 60 * 1000); // 20 requests per minute
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "You are asking questions quickly! Please wait a moment before sending another prompt.",
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

  try {
    const body = await request.json();
    const validated = AssistantQuerySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid query parameters.",
          },
        },
        { status: 400 }
      );
    }

    const { prompt, period, history } = validated.data;
    const response = await askAssistant(
      user.userId,
      prompt,
      history as any,
      period
    );

    return NextResponse.json({ data: response });
  } catch (error: any) {
    console.error("AI Assistant request failed:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate AI response." } },
      { status: 500 }
    );
  }
}

