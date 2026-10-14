import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { UpdateCategorySchema } from "@/server/models/category";
import {
  getCategoryById,
  updateCategory,
  archiveCategory,
} from "@/server/services/category.service";

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
  const category = await getCategoryById(user.userId, id);

  if (!category) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Category not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { category } });
}

export async function PATCH(
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
    const validated = UpdateCategorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid update data.",
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateCategory(user.userId, id, validated.data);
    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Category not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { category: updated } });
  } catch (error: any) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update category." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
  const success = await archiveCategory(user.userId, id);

  if (!success) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Category not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { message: "Category archived successfully." } });
}
