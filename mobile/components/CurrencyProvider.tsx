import React, { createContext, useContext } from "react";
import { Currency } from "../lib/currencyUtils";
import { useSettings } from "../hooks/useSettings";

interface CurrencyContextType {
  currency: Currency;
  currencySymbol: string;
  isLoaded: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

/**
 * CurrencyProvider — drives currency from backend settings.
 * No client-side toggle. The store's configured currency is the single source of truth.
 */
export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: settings, isLoading } = useSettings();

  // Derive from backend settings, fallback to LKR
  const currency: Currency = (settings?.localization?.currency as Currency) || "LKR";
  const currencySymbol = settings?.localization?.currencySymbol || "Rs.";

  return (
    <CurrencyContext.Provider value={{ currency, currencySymbol, isLoaded: !isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
