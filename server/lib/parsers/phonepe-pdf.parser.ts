import {
  NormalizedParsedRow,
  normalizeBankDate,
  parseCurrencyToPaise,
} from "@/server/lib/parsers/csv.parser";

const PHONEPE_DATE_REGEX = /^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i;
const TIME_REGEX = /^\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)$/;
const FOOTER_PAGE_REGEX = /^Page\s+\d+\s+of\s+\d+/i;
const FOOTER_NOTE_REGEX = /^(?:This is a system generated statement|Disclaimer\s*:|Transaction Statement for)/i;

/**
 * Parses raw text extracted from a PhonePe transaction statement PDF.
 */
export function parsePhonePeText(extractedText: string): NormalizedParsedRow[] {
  if (!extractedText || extractedText.trim().length === 0) {
    return [];
  }

  const lines = extractedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !FOOTER_PAGE_REGEX.test(l) && !FOOTER_NOTE_REGEX.test(l));

  // 1. Group lines into transaction blocks starting from each date line
  interface RawTxBlock {
    rawDate: string;
    lines: string[];
  }

  const blocks: RawTxBlock[] = [];
  let currentBlock: RawTxBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(PHONEPE_DATE_REGEX);

    if (dateMatch) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        rawDate: dateMatch[1],
        lines: [],
      };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  // 2. Parse each transaction block
  const parsedRows: NormalizedParsedRow[] = [];
  let rowIndex = 0;

  for (const block of blocks) {
    rowIndex++;
    const normalizedDate = normalizeBankDate(block.rawDate);

    let isDebit: boolean | null = null;
    let amountPaise = 0;
    let descriptionParts: string[] = [];
    let referenceNo: string | undefined;

    for (let j = 0; j < block.lines.length; j++) {
      const line = block.lines[j];

      // Ignore time lines (e.g. 08:07 pm)
      if (TIME_REGEX.test(line)) continue;

      // Extract Transaction ID
      const txIdMatch = line.match(/Transaction ID\s+([A-Za-z0-9]+)/i);
      if (txIdMatch) {
        referenceNo = txIdMatch[1];
        continue;
      }

      // Extract UTR No
      const utrMatch = line.match(/UTR No\.?\s*([A-Za-z0-9]+)/i);
      if (utrMatch && !referenceNo) {
        referenceNo = utrMatch[1];
        continue;
      }

      // Ignore metadata lines
      if (/^(?:Paid by|Credited to)/i.test(line)) continue;

      // Check for DEBIT / CREDIT
      if (/\bDEBIT\b/i.test(line)) {
        isDebit = true;
      } else if (/\bCREDIT\b/i.test(line)) {
        isDebit = false;
      }

      // Check for currency amount (e.g. ₹290, ₹1,274.5, ₹25,000, or 290)
      const amountMatch = line.match(/₹\s*([\d,]+(?:\.\d+)?)/);
      if (amountMatch && amountPaise === 0) {
        amountPaise = parseCurrencyToPaise(amountMatch[1]);
      }

      // Extract recipient / narrative
      // Check if line starts with Paid to, Received from, Transfer to
      const actionMatch = line.match(/^(Paid to|Received from|Transfer to|Payment to|Refund from)\s*(.*)/i);
      if (actionMatch) {
        const actionPrefix = actionMatch[1];
        let rest = actionMatch[2] || "";

        // Strip DEBIT / CREDIT and amount from same line
        rest = rest
          .replace(/\b(?:DEBIT|CREDIT)\b/gi, "")
          .replace(/₹\s*[\d,]+(?:\.\d+)?/g, "")
          .trim();

        if (rest.length > 0) {
          descriptionParts.push(`${actionPrefix} ${rest}`);
        } else {
          // If rest was empty (e.g. "Paid to DEBIT ₹3,700"), next line will have the name
          let nextName = "";
          if (j + 1 < block.lines.length && !TIME_REGEX.test(block.lines[j + 1]) && !/Transaction ID|UTR/i.test(block.lines[j + 1])) {
            nextName = block.lines[j + 1];
            j++; // advance past next line
            // If next line has another line following before Transaction ID, collect it
            if (j + 1 < block.lines.length && !/Transaction ID|UTR|Paid by|Credited to/i.test(block.lines[j + 1])) {
              nextName += ` ${block.lines[j + 1]}`;
              j++;
            }
          }
          descriptionParts.push(`${actionPrefix} ${nextName}`.trim());
        }
      }
    }

    // Fallback amount check if not yet found
    if (amountPaise === 0) {
      for (const line of block.lines) {
        const fallbackMatch = line.match(/(?:DEBIT|CREDIT)?\s*₹?\s*([\d,]+(?:\.\d+)?)/);
        if (fallbackMatch && fallbackMatch[1] && !/Transaction|UTR/i.test(line)) {
          amountPaise = parseCurrencyToPaise(fallbackMatch[1]);
          if (amountPaise > 0) break;
        }
      }
    }

    const finalDescription = descriptionParts.join(" ").trim() || "PhonePe Transaction";
    const type: "income" | "expense" = isDebit === false ? "income" : "expense";

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
      description: finalDescription.slice(0, 200),
      type,
      amountPaise,
      referenceNo,
      isValid,
      error,
    });
  }

  return parsedRows;
}
