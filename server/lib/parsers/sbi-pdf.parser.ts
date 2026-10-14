import { extractText } from "unpdf";
import {
  NormalizedParsedRow,
  normalizeBankDate,
  parseCurrencyToPaise,
} from "@/server/lib/parsers/csv.parser";
import { parsePhonePeText } from "@/server/lib/parsers/phonepe-pdf.parser";

/**
 * Parses Indian bank and UPI statement PDFs (SBI e-Statements, PhonePe, and similar formats).
 * Automatically converts Node.js Buffers to pure Uint8Array to satisfy pdfjs requirements.
 */
export async function parseSbiPdfStatement(
  pdfBuffer: Uint8Array | ArrayBuffer | Buffer
): Promise<{ rows: NormalizedParsedRow[]; warnings: string[] }> {
  const warnings: string[] = [];
  let extractedText = "";

  try {
    // pdfjs/unpdf strictly requires a pure Uint8Array (and throws if passed a Node.js Buffer)
    let uint8Data: Uint8Array;
    if (pdfBuffer instanceof Uint8Array) {
      uint8Data = new Uint8Array(
        pdfBuffer.buffer.slice(
          pdfBuffer.byteOffset,
          pdfBuffer.byteOffset + pdfBuffer.byteLength
        )
      );
    } else {
      uint8Data = new Uint8Array(pdfBuffer);
    }

    const result = await extractText(uint8Data);
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

  // 1. Detect if this is a PhonePe statement
  const isPhonePe =
    /phonepe/i.test(extractedText) ||
    /Transaction Statement for/i.test(extractedText) ||
    /(?:Paid to|Received from).+(?:DEBIT|CREDIT)/i.test(extractedText);

  if (isPhonePe) {
    const phonePeRows = parsePhonePeText(extractedText);
    if (phonePeRows.length > 0) {
      return { rows: phonePeRows, warnings };
    }
  }

  // 2. Tabular SBI Statement Parsing
  const lines = extractedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsedRows: NormalizedParsedRow[] = [];
  let rowIndex = 0;

  // Regex matching SBI transaction rows:
  // Starts with date: DD Mon YYYY (e.g. 15 Jan 2026) or DD/MM/YYYY
  const sbiRowRegex = /^(\d{1,2}[-/\s][A-Za-z]{3,4}[-/\s]\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(sbiRowRegex);

    if (match) {
      rowIndex++;
      const rawDate = match[1];
      const remainder = line.substring(match[0].length).trim();

      const numberMatches = Array.from(
        remainder.matchAll(/(?:(?:\d{1,3},)+\d{3}|\d+)\.\d{2}/g)
      ).map((m) => m[0]);

      let debitPaise = 0;
      let creditPaise = 0;
      let description = remainder;
      let referenceNo: string | undefined;

      if (numberMatches.length >= 2) {
        const txnAmountStr = numberMatches[numberMatches.length - 2];
        const paise = parseCurrencyToPaise(txnAmountStr);

        const isDebit =
          line.toLowerCase().includes("dr") ||
          remainder.indexOf(txnAmountStr) < remainder.length / 2;

        if (isDebit) {
          debitPaise = paise;
        } else {
          creditPaise = paise;
        }

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

  // 3. If SBI row matching yielded 0 rows, try PhonePe fallback
  if (parsedRows.length === 0) {
    const fallbackRows = parsePhonePeText(extractedText);
    if (fallbackRows.length > 0) {
      return { rows: fallbackRows, warnings };
    }
  }

  if (parsedRows.length === 0) {
    warnings.push(
      "No transaction patterns matched the extracted PDF text. Please ensure this is an official SBI e-statement or PhonePe statement, or export as CSV."
    );
  }

  return { rows: parsedRows, warnings };
}

// Export alias for wider statement support
export const parsePdfStatement = parseSbiPdfStatement;
