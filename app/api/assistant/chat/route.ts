import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { AssistantQuerySchema } from "@/server/models/assistant";
import { askAssistant } from "@/server/services/ai-gateway.service";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required to use AI Assistant." } },
      { status: 401 }
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

