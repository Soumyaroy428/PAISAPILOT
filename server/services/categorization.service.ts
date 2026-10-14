export interface CategorizationResult {
  categoryName: string;
  confidence: number;
  matchReason?: string;
  isMatched: boolean;
  source: "deterministic_rule" | "fallback";
}

interface MerchantRule {
  category: string;
  kind: "expense" | "income";
  keywords: string[];
}

/**
 * Deterministic rule dictionary tailored for the Indian commerce and banking ecosystem.
 * Covers major UPI handles, merchant IDs, and recurring billing narrations.
 */
export const INDIAN_MERCHANT_RULES: MerchantRule[] = [
  // 1. Food & Dining
  {
    category: "Food & Dining",
    kind: "expense",
    keywords: [
      "swiggy",
      "zomato",
      "mcdonalds",
      "starbucks",
      "dominos",
      "kfc",
      "pizza hut",
      "subway",
      "burger king",
      "chai point",
      "chaayos",
      "haldiram",
      "canteen",
      "mess dues",
      "bakery",
      "restaurant",
      "cafe",
      "food court",
      "eatfit",
      "barbeque nation",
    ],
  },

  // 2. Groceries & Daily Essentials
  {
    category: "Groceries",
    kind: "expense",
    keywords: [
      "blinkit",
      "zepto",
      "instamart",
      "dmart",
      "bigbasket",
      "nature basket",
      "spencer",
      "more retail",
      "supermarket",
      "kirana",
      "dairy",
      "amul",
      "mother dairy",
      "vegetable",
      "groceries",
      "country delight",
    ],
  },

  // 3. Transport & Commute
  {
    category: "Transport",
    kind: "expense",
    keywords: [
      "uber",
      "ola",
      "rapido",
      "namma yatri",
      "metro rail",
      "dmrc",
      "bmrc",
      "irctc",
      "indian railway",
      "makemytrip",
      "ixigo",
      "redbus",
      "petrol",
      "fuel",
      "hpcl",
      "bpcl",
      "iocl",
      "indian oil",
      "fastag",
      "toll",
      "parking",
    ],
  },

  // 4. Shopping & E-Commerce
  {
    category: "Shopping",
    kind: "expense",
    keywords: [
      "amazon",
      "flipkart",
      "myntra",
      "meesho",
      "ajio",
      "nykaa",
      "tata cliq",
      "croma",
      "reliance retail",
      "reliance digital",
      "ikea",
      "zara",
      "h&m",
      "decathlon",
      "lifestyle",
      "shoppers stop",
    ],
  },

  // 5. Utilities & Household Bills
  {
    category: "Bills & Utilities",
    kind: "expense",
    keywords: [
      "electricity",
      "bescom",
      "tneb",
      "cesc",
      "uppcl",
      "msedcl",
      "water bill",
      "broadband",
      "airtel",
      "jio",
      "vodafone",
      "vi bill",
      "act fibernet",
      "tata play",
      "tatasky",
      "dth",
      "gas cylinder",
      "indane",
      "hp gas",
      "bharat gas",
      "piped gas",
      "igl",
      "mgl",
    ],
  },

  // 6. Housing & Rent
  {
    category: "Housing & Rent",
    kind: "expense",
    keywords: [
      "rent",
      "house rent",
      "nobroker",
      "maintenance fee",
      "society maintenance",
      "hostel fee",
      "pg accommodation",
      "apartment dues",
      "home loan emi",
    ],
  },

  // 7. Entertainment & Subscriptions
  {
    category: "Entertainment",
    kind: "expense",
    keywords: [
      "netflix",
      "spotify",
      "hotstar",
      "disney",
      "prime video",
      "youtube",
      "bookmyshow",
      "pvr",
      "inox",
      "cinema",
      "theatre",
      "steam",
      "playstation",
      "apple services",
      "google play",
    ],
  },

  // 8. Healthcare & Pharmacy
  {
    category: "Healthcare",
    kind: "expense",
    keywords: [
      "apollo",
      "pharmeasy",
      "1mg",
      "tata 1mg",
      "medplus",
      "netmeds",
      "practo",
      "cultfit",
      "gym",
      "hospital",
      "clinic",
      "diagnostic",
      "dr lal",
      "dental",
      "pharmacy",
      "chemist",
    ],
  },

  // 9. Investments & Savings
  {
    category: "Investments",
    kind: "expense",
    keywords: [
      "zerodha",
      "groww",
      "kuvera",
      "coin",
      "upstox",
      "angel one",
      "sip",
      "mutual fund",
      "etf",
      "ppf",
      "nps",
      "fixed deposit",
      "recurring deposit",
      "gold lease",
    ],
  },

  // 10. Education & Learning
  {
    category: "Education",
    kind: "expense",
    keywords: [
      "tuition",
      "school fee",
      "college fee",
      "university fee",
      "udemy",
      "coursera",
      "unacademy",
      "byjus",
      "physicswallah",
      "books",
      "stationery",
      "exam fee",
    ],
  },

  // 11. Salary & Primary Inflow
  {
    category: "Salary & Income",
    kind: "income",
    keywords: [
      "salary",
      "payroll",
      "stipend",
      "bonus",
      "incentive",
      "interest credit",
      "fd interest",
      "dividend",
      "client invoice",
      "consulting fee",
      "allowance",
    ],
  },
];

/**
 * Matches a transaction description against deterministic merchant rules.
 * Never overrides user-confirmed classifications.
 */
export function matchDeterministicCategory(
  description: string,
  type: "income" | "expense" | "transfer" = "expense"
): CategorizationResult {
  if (type === "transfer") {
    return {
      categoryName: "Transfer",
      confidence: 1.0,
      matchReason: "Internal inter-account transfer",
      isMatched: true,
      source: "deterministic_rule",
    };
  }

  if (!description || description.trim().length === 0) {
    return {
      categoryName: "Uncategorized",
      confidence: 0,
      isMatched: false,
      source: "fallback",
    };
  }

  const normalized = description.toLowerCase();

  // Search through merchant rules
  for (const rule of INDIAN_MERCHANT_RULES) {
    // If transaction type is specified, prioritize matching kind
    if (type && rule.kind !== type && type !== "expense") {
      continue;
    }

    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        return {
          categoryName: rule.category,
          confidence: 0.95,
          matchReason: `Matched merchant keyword: "${keyword}" -> ${rule.category}`,
          isMatched: true,
          source: "deterministic_rule",
        };
      }
    }
  }

  return {
    categoryName: "Uncategorized",
    confidence: 0.1,
    matchReason: "No deterministic merchant pattern matched",
    isMatched: false,
    source: "fallback",
  };
}

