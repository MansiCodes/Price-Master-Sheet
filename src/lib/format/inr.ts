/**
 * Format a number as Indian Rupees (en-IN).
 * Accepts number, string, or Prisma Decimal-like values with toNumber/toString.
 */
export function formatINR(
  amount: number | string | { toNumber?: () => number; toString: () => string },
): string {
  const value =
    typeof amount === "number"
      ? amount
      : typeof amount === "string"
        ? Number(amount)
        : typeof amount.toNumber === "function"
          ? amount.toNumber()
          : Number(amount.toString());

  if (!Number.isFinite(value)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
