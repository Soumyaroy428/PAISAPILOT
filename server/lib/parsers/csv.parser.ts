export interface ParsedRawRow {
  rowIndex: number;
  dateStr: string;
  description: string;
  debitStr?: string;
  creditStr?: string;
  amountStr?: string;
  typeStr?: string;
  referenceNo?: string;
  rawText: string;
}

export interface NormalizedParsedRow {
  rowIndex: number;
  transactionDate: string; // ISO format YYYY-MM-DD
  description: string;
  type: "income" | "expense";
  amountPaise: number;
  referenceNo?: string;
  isValid: boolean;
  error?: string;
}

const MONTH_MAP: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/**
 * Normalizes Indian banking date formats to standard ISO YYYY-MM-DD.
 */
export function normalizeBankDate(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim();

  // 1. ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. DD/MM/YY or DD-MM-YY (2000s)
  const dmyShortMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (dmyShortMatch) {
    const day = dmyShortMatch[1].padStart(2, "0");
    const month = dmyShortMatch[2].padStart(2, "0");
    const year = `20${dmyShortMatch[3]}`;
    return `${year}-${month}-${day}`;
  }

  // 4. DD-Mon-YYYY or DD Mon YYYY (e.g. 14-Oct-2026, 14 Oct 2026)
  const monMatch = clean.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{4})$/);
  if (monMatch) {
    const day = monMatch[1].padStart(2, "0");
    const monStr = monMatch[2].toLowerCase();
    const month = MONTH_MAP[monStr];
    const year = monMatch[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Fallback Date parser
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Parses Indian currency strings (with commas, rupee symbols, Dr/Cr) into integer paise.
 */
export function parseCurrencyToPaise(val: string): number {
  if (!val) return 0;
  // Remove currency symbols, commas, quotes, and whitespace
  const sanitized = val
    .replace(/[₹$,\s"]/g, "")
    .replace(/cr/i, "")
    .replace(/dr/i, "")
    .trim();

  const num = parseFloat(sanitized);
  if (isNaN(num)) return 0;

  // Convert to absolute integer paise
  return Math.round(Math.abs(num) * 100);
}

/**
 * Splits a CSV line into cells respecting double quotes.
 */
function splitCsvLine(line: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Robust CSV parser tailored for Indian bank statements (HDFC, SBI, ICICI, Axis, Paytm).
 */
export function parseStatementCsv(csvContent: string): NormalizedParsedRow[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return [];
  }

  // Auto-detect delimiter
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const delimiter = tabCount > commaCount && tabCount > semiCount ? "\t" : semiCount > commaCount ? ";" : ",";

  // Find header row by matching date and description/narration keywords
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cells = splitCsvLine(lines[i], delimiter).map((c) => c.toLowerCase());
    const hasDate = cells.some((c) => c.includes("date"));
    const hasDesc = cells.some((c) =>
      c.includes("narration") ||
      c.includes("description") ||
      c.includes("particulars") ||
      c.includes("remarks") ||
      c.includes("details")
    );

    if (hasDate && hasDesc) {
      headerIndex = i;
      headers = cells;
      break;
    }
  }

  // If no header found, assume row 0 is headers
  if (headerIndex === -1) {
    headerIndex = 0;
    headers = splitCsvLine(lines[0], delimiter).map((c) => c.toLowerCase());
  }

  // Map header column indices
  let dateCol = headers.findIndex((h) => h.includes("date") && !h.includes("value"));
  if (dateCol === -1) dateCol = headers.findIndex((h) => h.includes("date"));

  const descCol = headers.findIndex((h) =>
    h.includes("narration") ||
    h.includes("description") ||
    h.includes("particulars") ||
    h.includes("remarks") ||
    h.includes("details")
  );

  const debitCol = headers.findIndex((h) =>
    h.includes("debit") || h.includes("withdrawal") || h.includes("dr")
  );

  const creditCol = headers.findIndex((h) =>
    h.includes("credit") || h.includes("deposit") || h.includes("cr")
  );

  const amountCol = headers.findIndex((h) => h.includes("amount"));
  const typeCol = headers.findIndex((h) => h === "type" || h.includes("txn type") || h.includes("cr/dr"));
  const refCol = headers.findIndex((h) =>
    h.includes("ref") || h.includes("cheque") || h.includes("chq") || h.includes("utr") || h.includes("txn id")
  );

  const parsedRows: NormalizedParsedRow[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const cells = splitCsvLine(line, delimiter);

    // Skip empty lines or summary footer lines (e.g. "Total:", "Closing Balance:")
    if (cells.length === 0 || !cells.some((c) => c.length > 0)) continue;
    const firstCell = cells[0].toLowerCase();
    if (firstCell.startsWith("total") || firstCell.startsWith("closing") || firstCell.startsWith("statement")) {
      continue;
    }

    const rawDate = dateCol !== -1 ? cells[dateCol] || "" : "";
    const rawDesc = descCol !== -1 ? cells[descCol] || "" : "";
    const rawDebit = debitCol !== -1 ? cells[debitCol] || "" : "";
    const rawCredit = creditCol !== -1 ? cells[creditCol] || "" : "";
    const rawAmount = amountCol !== -1 ? cells[amountCol] || "" : "";
    const rawType = typeCol !== -1 ? cells[typeCol] || "" : "";
    const rawRef = refCol !== -1 ? cells[refCol] || "" : undefined;

    const normalizedDate = normalizeBankDate(rawDate);
    const debitPaise = parseCurrencyToPaise(rawDebit);
    const creditPaise = parseCurrencyToPaise(rawCredit);

    let type: "income" | "expense" = "expense";
    let amountPaise = 0;

    if (debitPaise > 0) {
      type = "expense";
      amountPaise = debitPaise;
    } else if (creditPaise > 0) {
      type = "income";
      amountPaise = creditPaise;
    } else if (rawAmount) {
      amountPaise = parseCurrencyToPaise(rawAmount);
      const isCredit =
        rawType.toLowerCase().includes("cr") ||
        rawAmount.toLowerCase().includes("cr") ||
        parseFloat(rawAmount.replace(/,/g, "")) > 0;
      type = isCredit ? "income" : "expense";
    }

    // Validation
    let isValid = true;
    let error: string | undefined;

    if (!normalizedDate) {
      isValid = false;
      error = "Unparseable transaction date";
    } else if (amountPaise <= 0) {
      isValid = false;
      error = "Missing or zero transaction amount";
    } else if (!rawDesc || rawDesc.trim().length === 0) {
      isValid = false;
      error = "Missing description";
    }

    parsedRows.push({
      rowIndex: i,
      transactionDate: normalizedDate || new Date().toISOString().split("T")[0],
      description: (rawDesc || "Unspecified Transaction").trim().slice(0, 200),
      type,
      amountPaise,
      referenceNo: rawRef ? rawRef.trim() : undefined,
      isValid,
      error,
    });
  }

  return parsedRows;
}

