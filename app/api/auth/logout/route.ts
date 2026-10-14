import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/lib/auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({
    data: {
      message: "Successfully signed out.",
    },
  });
}

