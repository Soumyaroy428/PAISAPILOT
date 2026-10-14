import { ObjectId } from "mongodb";
import { getCollection, ensureDatabaseIndexes } from "@/server/db/mongodb";
import {
  CategoryDocument,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/server/models/category";
import { TransactionDocument } from "@/server/models/transaction";
import { matchDeterministicCategory } from "@/server/services/categorization.service";

/**
 * Returns all active categories for the user.
 * Auto-seeds default taxonomy if user has no categories.
 */
export async function getCategories(userId: string): Promise<CategoryDocument[]> {
  await ensureDatabaseIndexes();
  const categoriesCol = await getCollection<CategoryDocument>("categories");

  const categories = await categoriesCol
    .find({ userId, isArchived: false })
    .sort({ name: 1 })
    .toArray();

  if (categories.length === 0) {
    return seedDefaultCategories(userId);
  }

  return categories;
}

/**
 * Seeds default categories for a new user based on standard Indian financial taxonomy.
 */
export async function seedDefaultCategories(userId: string): Promise<CategoryDocument[]> {
  const categoriesCol = await getCollection<CategoryDocument>("categories");

  const defaultPresets: Array<{ name: string; kind: "expense" | "income" | "both"; color: string }> = [
    { name: "Food & Dining", kind: "expense", color: "#f97316" },
    { name: "Groceries", kind: "expense", color: "#10b981" },
    { name: "Transport", kind: "expense", color: "#0ea5e9" },
    { name: "Housing & Rent", kind: "expense", color: "#6366f1" },
    { name: "Bills & Utilities", kind: "expense", color: "#eab308" },
    { name: "Shopping", kind: "expense", color: "#ec4899" },
    { name: "Healthcare", kind: "expense", color: "#ef4444" },
    { name: "Entertainment", kind: "expense", color: "#8b5cf6" },
    { name: "Investments", kind: "expense", color: "#14b8a6" },
    { name: "Education", kind: "expense", color: "#3b82f6" },
    { name: "Salary & Income", kind: "income", color: "#22c55e" },
    { name: "Freelance / Business", kind: "income", color: "#06b6d4" },
    { name: "Other Expenses", kind: "expense", color: "#64748b" },
  ];

  const docs: Omit<CategoryDocument, "_id">[] = defaultPresets.map((p) => ({
    userId,
    name: p.name,
    nameNormalized: p.name.toLowerCase().trim(),
    kind: p.kind,
    color: p.color,
    isSystem: true,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await categoriesCol.insertMany(docs as any);
  return categoriesCol.find({ userId, isArchived: false }).sort({ name: 1 }).toArray();
}

/**
 * Creates a custom category with uniqueness enforcement per user.
 */
export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<CategoryDocument> {
  await ensureDatabaseIndexes();
  const categoriesCol = await getCollection<CategoryDocument>("categories");

  const normalized = input.name.toLowerCase().trim();
  const existing = await categoriesCol.findOne({
    userId,
    nameNormalized: normalized,
    isArchived: false,
  });

  if (existing) {
    throw new Error(`Category "${input.name}" already exists.`);
  }

  const newDoc: Omit<CategoryDocument, "_id"> = {
    userId,
    name: input.name.trim(),
    nameNormalized: normalized,
    kind: input.kind || "expense",
    color: input.color || "#6366f1",
    icon: input.icon,
    isSystem: false,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await categoriesCol.insertOne(newDoc as any);
  return {
    _id: res.insertedId,
    ...newDoc,
  } as unknown as CategoryDocument;
}

/**
 * Retrieves a single category with user ownership validation.
 */
export async function getCategoryById(
  userId: string,
  categoryId: string
): Promise<CategoryDocument | null> {
  if (!ObjectId.isValid(categoryId)) return null;

  const categoriesCol = await getCollection<CategoryDocument>("categories");
  return categoriesCol.findOne({
    _id: new ObjectId(categoryId),
    userId,
  });
}

/**
 * Updates a custom category.
 */
export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput
): Promise<CategoryDocument | null> {
  if (!ObjectId.isValid(categoryId)) return null;

  const categoriesCol = await getCollection<CategoryDocument>("categories");
  const updateFields: any = {
    ...input,
    updatedAt: new Date(),
  };

  if (input.name) {
    updateFields.name = input.name.trim();
    updateFields.nameNormalized = input.name.toLowerCase().trim();
  }

  return categoriesCol.findOneAndUpdate(
    { _id: new ObjectId(categoryId), userId },
    { $set: updateFields },
    { returnDocument: "after" }
  );
}

/**
 * Archives a category (soft-delete). Historical transactions using it are preserved.
 */
export async function archiveCategory(
  userId: string,
  categoryId: string
): Promise<boolean> {
  if (!ObjectId.isValid(categoryId)) return false;

  const categoriesCol = await getCollection<CategoryDocument>("categories");
  const res = await categoriesCol.updateOne(
    { _id: new ObjectId(categoryId), userId },
    { $set: { isArchived: true, updatedAt: new Date() } }
  );

  return res.modifiedCount > 0;
}

/**
 * Runs deterministic rule matching over unassigned or uncategorized transactions.
 * Preserves user-confirmed categories — never overwrites manually set labels!
 */
export async function autoCategorizeUnassignedTransactions(userId: string): Promise<{
  totalChecked: number;
  totalCategorized: number;
  categorizedBreakdown: Record<string, number>;
}> {
  await ensureDatabaseIndexes();
  const transactionsCol = await getCollection<TransactionDocument>("transactions");

  // Find transactions that are uncategorized or empty
  const unassigned = await transactionsCol
    .find({
      userId,
      $or: [
        { categoryName: { $exists: false } },
        { categoryName: null as any },
        { categoryName: "" },
        { categoryName: "Uncategorized" },
      ],
    })
    .toArray();

  let totalCategorized = 0;
  const categorizedBreakdown: Record<string, number> = {};

  for (const txn of unassigned) {
    const match = matchDeterministicCategory(txn.description, txn.type);

    if (match.isMatched && match.categoryName !== "Uncategorized") {
      await transactionsCol.updateOne(
        { _id: txn._id, userId },
        {
          $set: {
            categoryName: match.categoryName,
            updatedAt: new Date(),
          },
        }
      );

      totalCategorized++;
      categorizedBreakdown[match.categoryName] =
        (categorizedBreakdown[match.categoryName] || 0) + 1;
    }
  }

  return {
    totalChecked: unassigned.length,
    totalCategorized,
    categorizedBreakdown,
  };
}
