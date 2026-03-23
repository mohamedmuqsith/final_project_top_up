/**
 * Formats a number as a currency string.
 * Uses the store's currency code and symbol — no client-side conversion.
 *
 * @param {number} amount - The amount (already in the store's base currency).
 * @param {string} currencyCode - Currency code, e.g. 'LKR' or 'USD'.
 * @param {string|null} currencySymbol - Optional override for the symbol.
 * @returns {string} Formatted string like "Rs. 1,499.00" or "$14.99".
 */
export const formatCurrency = (amount, currencyCode = 'LKR', currencySymbol = null) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currencyCode?.toUpperCase() === 'USD' ? '$0.00' : 'Rs. 0.00';
  }

  const code = currencyCode?.toUpperCase() || 'LKR';

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (code === 'LKR') {
    return `${currencySymbol || 'Rs.'} ${formatted}`;
  }

  return `${currencySymbol || '$'}${formatted}`;
};
