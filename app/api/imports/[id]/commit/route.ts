import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { CommitImportSchema } from "@/server/models/import";
import { commitImport } from "@/server/services/import.service";

export async function POST(
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

  try {
    const body = await request.json();
    const validated = CommitImportSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid commit parameters.",
          },
        },
        { status: 400 }
      );
    }

    const result = await commitImport(
      user.userId,
      id,
      validated.data.selectedRowIndices,
      validated.data.accountId
    );

    return NextResponse.json({
      data: {
        message: `Successfully committed ${result.insertedCount} transactions to ledger.`,
        ...result,
      },
    });
  } catch (error: any) {
    console.error("Commit import error:", error);
    return NextResponse.json(
      {
        error: {
          code: "COMMIT_FAILED",
          message: error.message || "Failed to commit statement transactions.",
        },
      },
      { status: 400 }
    );
  }
}

