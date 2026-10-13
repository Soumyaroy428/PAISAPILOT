import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with clsx and merges Tailwind classes safely with twMerge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats integer paise into a human-readable INR string.
 * Always handles exact currency arithmetic without floating-point errors.
 *
 * Example: 100050 -> "₹1,000.50"
 */
export function formatPaiseToINR(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  const formattedRupees = rupees.toLocaleString("en-IN");
  const formattedPaise = remainderPaise.toString().padStart(2, "0");

  return `${isNegative ? "-" : ""}₹${formattedRupees}.${formattedPaise}`;
}

