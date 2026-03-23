export type Currency = "USD" | "LKR";

/**
 * Formats a number as a currency string.
 * Uses the store's currency code and symbol — no client-side conversion.
 *
 * @param amount - The amount (already in the store's base currency).
 * @param currency - Currency code, e.g. 'LKR' or 'USD'.
 * @param currencySymbol - Optional override for the symbol.
 * @returns Formatted string like "Rs. 1,499.00" or "$14.99".
 */
export const formatCurrency = (amount: number | string, currency: Currency = "LKR", currencySymbol?: string) => {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(value)) return currency?.toUpperCase() === "USD" ? "$0.00" : "Rs. 0.00";

  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (currency?.toUpperCase() === "LKR") {
    return `${currencySymbol || "Rs."} ${formatted}`;
  }

  return `${currencySymbol || "$"}${formatted}`;
};
