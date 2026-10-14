import { ObjectId } from "mongodb";
import { getCollection } from "@/server/db/mongodb";
import { PersonaType, OnboardingProfile } from "@/server/models/user";

interface DefaultCategoryPreset {
  name: string;
  kind: "income" | "expense";
  colorToken: string;
}

const PERSONA_CATEGORY_PRESETS: Record<PersonaType, DefaultCategoryPreset[]> = {
  student: [
    { name: "Food & Mess", kind: "expense", colorToken: "#f97316" },
    { name: "Rent & Hostel", kind: "expense", colorToken: "#3b82f6" },
    { name: "Books & Courses", kind: "expense", colorToken: "#8b5cf6" },
    { name: "Campus Outings & Snacks", kind: "expense", colorToken: "#ec4899" },
    { name: "Subscriptions & OTT", kind: "expense", colorToken: "#10b981" },
    { name: "Allowance & Stipend", kind: "income", colorToken: "#22c55e" },
  ],
  young_professional: [
    { name: "Salary & Wages", kind: "income", colorToken: "#22c55e" },
    { name: "House Rent", kind: "expense", colorToken: "#3b82f6" },
    { name: "Groceries & Supermarket", kind: "expense", colorToken: "#f59e0b" },
    { name: "Dining & Food Delivery", kind: "expense", colorToken: "#f97316" },
    { name: "Commute, Fuel & Cabs", kind: "expense", colorToken: "#6366f1" },
    { name: "Loan EMIs & Credit Card", kind: "expense", colorToken: "#ef4444" },
    { name: "Investments & SIP", kind: "expense", colorToken: "#10b981" },
  ],
  freelancer: [
    { name: "Client Payouts & Retainers", kind: "income", colorToken: "#22c55e" },
    { name: "Tools & Software Subscriptions", kind: "expense", colorToken: "#6366f1" },
    { name: "Hardware & Workspace", kind: "expense", colorToken: "#8b5cf6" },
    { name: "Living Expenses & Rent", kind: "expense", colorToken: "#3b82f6" },
    { name: "Emergency & Tax Reserve", kind: "expense", colorToken: "#f59e0b" },
  ],
  family: [
    { name: "Household Income & Inflows", kind: "income", colorToken: "#22c55e" },
    { name: "Groceries & Daily Provisions", kind: "expense", colorToken: "#f59e0b" },
    { name: "School & Tuition Fees", kind: "expense", colorToken: "#3b82f6" },
    { name: "Utilities & Home Maintenance", kind: "expense", colorToken: "#eab308" },
    { name: "Medical & Healthcare", kind: "expense", colorToken: "#ef4444" },
    { name: "Family Savings & Reserve", kind: "expense", colorToken: "#10b981" },
  ],
  small_business: [
    { name: "Sales & Operating Revenue", kind: "income", colorToken: "#22c55e" },
    { name: "Inventory & Vendor Supplies", kind: "expense", colorToken: "#f59e0b" },
    { name: "Logistics, Delivery & Freight", kind: "expense", colorToken: "#6366f1" },
    { name: "Office Supplies & Utility", kind: "expense", colorToken: "#8b5cf6" },
    { name: "Owner Drawings & Profit Share", kind: "expense", colorToken: "#3b82f6" },
  ],
};

/**
 * Seeds default categories and baseline budgets for a user based on their persona.
 * Operates idempotently to avoid duplicating categories.
 */
export async function seedUserPersonaPresets(
  userId: string,
  persona: PersonaType,
  monthlyBudgetPaise?: number
): Promise<void> {
  const categoriesCol = await getCollection("categories");
  const presets = PERSONA_CATEGORY_PRESETS[persona] || PERSONA_CATEGORY_PRESETS.young_professional;

  // Insert default categories if not already present
  for (const preset of presets) {
    const existing = await categoriesCol.findOne({
      userId: new ObjectId(userId),
      nameNormalized: preset.name.toLowerCase().trim(),
    });

    if (!existing) {
      await categoriesCol.insertOne({
        userId: new ObjectId(userId),
        name: preset.name,
        nameNormalized: preset.name.toLowerCase().trim(),
        kind: preset.kind,
        colorToken: preset.colorToken,
        isSystem: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // Seed baseline budget if specified
  if (monthlyBudgetPaise && monthlyBudgetPaise > 0) {
    const budgetsCol = await getCollection("budgets");
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const existingBudget = await budgetsCol.findOne({
      userId: new ObjectId(userId),
      periodStart: currentMonthStart,
      isOverall: true,
    });

    if (!existingBudget) {
      await budgetsCol.insertOne({
        userId: new ObjectId(userId),
        periodType: "monthly",
        periodStart: currentMonthStart,
        limitPaise: monthlyBudgetPaise,
        currency: "INR",
        isOverall: true,
        thresholdAlertPercent: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

