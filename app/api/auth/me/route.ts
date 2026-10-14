import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "You must be signed in to access this resource.",
        },
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    data: {
      user,
    },
  });
}

