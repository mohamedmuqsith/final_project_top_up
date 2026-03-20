export const EXCHANGE_RATE = 300; // 1 USD = 300 LKR

export type Currency = "USD" | "LKR";

export const formatCurrency = (amount: number | string, currency: Currency = "USD") => {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(value)) return currency === "USD" ? "$0.00" : "Rs. 0.00";

  if (currency === "LKR") {
    const lkrValue = value * EXCHANGE_RATE;
    return `Rs. ${lkrValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const convertToCurrency = (amount: number, targetCurrency: Currency) => {
  if (targetCurrency === "LKR") {
    return amount * EXCHANGE_RATE;
  }
  return amount;
};
