import { NextResponse } from "next/server";
import { getCollection } from "@/server/db/mongodb";
import { LoginInputSchema, UserDocument } from "@/server/models/user";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/server/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = LoginInputSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid email or password",
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = validated.data;
    const usersCol = await getCollection<UserDocument>("users");
    const user = await usersCol.findOne({ emailNormalized: email });

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password. Please verify your credentials.",
          },
        },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password. Please verify your credentials.",
          },
        },
        { status: 401 }
      );
    }

    const userId = user._id.toString();
    const token = await createSessionToken({
      userId,
      email: user.emailNormalized,
      displayName: user.displayName,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      data: {
        user: {
          id: userId,
          email: user.emailNormalized,
          displayName: user.displayName,
          persona: user.persona || null,
          onboardingCompleted: Boolean(user.onboardingCompleted),
        },
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error?.message || "Failed to sign in.",
        },
      },
      { status: 500 }
    );
  }
}
