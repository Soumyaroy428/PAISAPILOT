import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { getImportById } from "@/server/services/import.service";

export async function GET(
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
  const importRecord = await getImportById(user.userId, id);

  if (!importRecord) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Import record not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { import: importRecord } });
}

