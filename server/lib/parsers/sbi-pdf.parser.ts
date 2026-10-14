import { extractText } from "unpdf";
import {
  NormalizedParsedRow,
  normalizeBankDate,
  parseCurrencyToPaise,
} from "@/server/lib/parsers/csv.parser";

/**
 * Specifically tested parser adapter for State Bank of India (SBI) e-Statements.
 * Note: Scanned image PDFs and password-protected files must be unlocked or exported as CSV.
 */
export async function parseSbiPdfStatement(
  pdfBuffer: Uint8Array | ArrayBuffer
): Promise<{ rows: NormalizedParsedRow[]; warnings: string[] }> {
  const warnings: string[] = [];
  let extractedText = "";

  try {
    const result = await extractText(pdfBuffer);
    extractedText = Array.isArray(result.text) ? result.text.join("\n") : result.text || "";
  } catch (err: any) {
    throw new Error(
      `Failed to extract text from PDF: ${err.message || "Encrypted or corrupted PDF"}. Please verify the file is not password-protected.`
    );
  }

  if (!extractedText || extractedText.trim().length === 0) {
    return {
      rows: [],
      warnings: [
        "The uploaded PDF contains no extractable text. Scanned document images require OCR or CSV export.",
      ],
    };
  }

  const lines = extractedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsedRows: NormalizedParsedRow[] = [];
  let rowIndex = 0;

  // Regex matching SBI transaction rows:
  // Typically starts with date: DD Mon YYYY (e.g. 15 Jan 2026) or DD/MM/YYYY
  // followed by value date, description, ref, debit/credit, balance
  const sbiRowRegex = /^(\d{1,2}[-/\s][A-Za-z]{3}[-/\s]\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(sbiRowRegex);

    if (match) {
      rowIndex++;
      const rawDate = match[1];
      const remainder = line.substring(match[0].length).trim();

      // Find amounts at the tail of the line (e.g. Debit, Credit, Balance)
      // SBI lines typically end with: <Debit or empty> <Credit or empty> <Balance>
      const numberMatches = Array.from(
        remainder.matchAll(/(?:(?:\d{1,3},)+\d{3}|\d+)\.\d{2}/g)
      ).map((m) => m[0]);

      let debitPaise = 0;
      let creditPaise = 0;
      let description = remainder;
      let referenceNo: string | undefined;

      if (numberMatches.length >= 2) {
        // Last number is balance, second to last is debit or credit
        const txnAmountStr = numberMatches[numberMatches.length - 2];
        const paise = parseCurrencyToPaise(txnAmountStr);

        // Check if debit or credit based on position or line indicator
        const isDebit =
          line.toLowerCase().includes("dr") ||
          remainder.indexOf(txnAmountStr) < remainder.length / 2;

        if (isDebit) {
          debitPaise = paise;
        } else {
          creditPaise = paise;
        }

        // Clean description by stripping out the trailing amount strings
        const firstAmountIdx = remainder.indexOf(txnAmountStr);
        if (firstAmountIdx > 0) {
          description = remainder.substring(0, firstAmountIdx).trim();
        }
      } else if (numberMatches.length === 1) {
        const paise = parseCurrencyToPaise(numberMatches[0]);
        debitPaise = paise;
        const idx = remainder.indexOf(numberMatches[0]);
        if (idx > 0) description = remainder.substring(0, idx).trim();
      }

      // Check for Ref / Cheque No in description
      const refMatch = description.match(/(?:TRANSFER|UPI|NEFT|IMPS|CHQ|REF)[-\s/]+([A-Za-z0-9]+)/i);
      if (refMatch) {
        referenceNo = refMatch[1];
      }

      const normalizedDate = normalizeBankDate(rawDate);
      const isExpense = debitPaise > 0;
      const amountPaise = isExpense ? debitPaise : creditPaise;

      let isValid = true;
      let error: string | undefined;

      if (!normalizedDate) {
        isValid = false;
        error = "Could not parse transaction date";
      } else if (amountPaise <= 0) {
        isValid = false;
        error = "Amount could not be extracted";
      }

      parsedRows.push({
        rowIndex,
        transactionDate: normalizedDate || new Date().toISOString().split("T")[0],
        description: (description || "SBI Transaction").slice(0, 200),
        type: isExpense ? "expense" : "income",
        amountPaise,
        referenceNo,
        isValid,
        error,
      });
    }
  }

  if (parsedRows.length === 0) {
    warnings.push(
      "No SBI statement transaction patterns matched the extracted PDF text. If this is an SBI statement, ensure it is the official e-statement format, or export as CSV."
    );
  }

  return { rows: parsedRows, warnings };
}

