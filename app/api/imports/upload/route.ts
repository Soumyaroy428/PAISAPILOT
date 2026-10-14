import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { createImportPreview } from "@/server/services/import.service";
import { ImportSourceType } from "@/server/models/import";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sourceType = (formData.get("sourceType") as ImportSourceType) || "csv";
    const accountId = (formData.get("accountId") as string) || undefined;

    if (!file) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Please select a statement file to upload." } },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "File exceeds the 5 MB limit. Please upload a smaller statement.",
          },
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const importPreview = await createImportPreview(
      user.userId,
      buffer,
      file.name,
      sourceType,
      accountId
    );

    return NextResponse.json({ data: { importPreview } }, { status: 201 });
  } catch (error: any) {
    console.error("Statement upload error:", error);
    return NextResponse.json(
      {
        error: {
          code: "PARSING_FAILED",
          message: error.message || "Failed to parse uploaded statement.",
        },
      },
      { status: 400 }
    );
  }
}

