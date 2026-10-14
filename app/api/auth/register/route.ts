import { NextResponse } from "next/server";
import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import { RegisterInputSchema, UserDocument } from "@/server/models/user";
import { hashPassword, createSessionToken, setSessionCookie } from "@/server/lib/auth";
import { rateLimiter, getClientIp } from "@/server/lib/rate-limiter";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = rateLimiter.check(`register_${ip}`, 5, 60 * 1000); // 5 registrations per minute per IP

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many registration attempts. Please wait a minute before trying again.",
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
    const validated = RegisterInputSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid input data",
          },
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validated.data;
    await ensureDatabaseIndexes();

    const usersCol = await getCollection<UserDocument>("users");
    const existing = await usersCol.findOne({ emailNormalized: email });

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: "EMAIL_EXISTS",
            message: "An account with this email address already exists.",
          },
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    const newUser: UserDocument = {
      emailNormalized: email,
      displayName: name,
      passwordHash,
      status: "active",
      persona: null,
      onboardingCompleted: false,
      onboardingProfile: null,
      preferences: {
        timezone: "Asia/Kolkata",
        currency: "INR",
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await usersCol.insertOne(newUser);
    const userId = result.insertedId.toString();

    // Create session token and set secure HttpOnly cookie
    const token = await createSessionToken({
      userId,
      email,
      displayName: name,
    });
    await setSessionCookie(token);

    return NextResponse.json(
      {
        data: {
          user: {
            id: userId,
            email,
            displayName: name,
            onboardingCompleted: false,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error?.message || "Failed to complete registration.",
        },
      },
      { status: 500 }
    );
  }
}
