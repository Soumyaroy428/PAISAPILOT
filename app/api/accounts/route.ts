import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { CreateAccountSchema } from "@/server/models/account";
import { getAccounts, createAccount } from "@/server/services/account.service";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const accounts = await getAccounts(user.userId);
    return NextResponse.json({ data: { accounts } });
  } catch (error: any) {
    console.error("Failed to fetch accounts:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch accounts." } },
      { status: 500 }
    );
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
    const validated = CreateAccountSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid account payload.",
          },
        },
        { status: 400 }
      );
    }

    const account = await createAccount(user.userId, validated.data);
    return NextResponse.json({ data: { account } }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create account:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message || "Failed to create account." } },
      { status: 500 }
    );
  }
}

