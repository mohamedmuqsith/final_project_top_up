export const EXCHANGE_RATE = 300; // 1 USD = 300 LKR (Safe constant)

/**
 * Formats a number as a currency string based on the selected currency.
 * @param {number} amount - The amount in USD (base currency).
 * @param {string} currency - The target currency ('USD' or 'LKR').
 * @returns {string} - Formatted currency string.
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === 'USD' ? '$0.00' : 'Rs. 0.00';
  }

  if (currency === 'LKR') {
    const lkrAmount = amount * EXCHANGE_RATE;
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(lkrAmount).replace('LKR', 'Rs.');
  }

  // Default USD
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Converts an amount from USD to the target currency.
 * @param {number} amount - The amount in USD.
 * @param {string} currency - The target currency.
 * @returns {number} - Converted value.
 */
export const convertToCurrency = (amount, currency = 'USD') => {
  if (!amount || isNaN(amount)) return 0;
  if (currency === 'LKR') return amount * EXCHANGE_RATE;
  return amount;
};
