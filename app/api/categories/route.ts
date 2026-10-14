import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/lib/auth";
import { CreateCategorySchema } from "@/server/models/category";
import { getCategories, createCategory } from "@/server/services/category.service";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const categories = await getCategories(user.userId);
    return NextResponse.json({ data: { categories } });
  } catch (error: any) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch categories." } },
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
    const validated = CreateCategorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validated.error.issues[0]?.message || "Invalid category payload.",
          },
        },
        { status: 400 }
      );
    }

    const category = await createCategory(user.userId, validated.data);
    return NextResponse.json({ data: { category } }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: error.message || "Failed to create category." } },
      { status: 400 }
    );
  }
}
