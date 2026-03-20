import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Currency } from "../lib/currencyUtils";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
  isLoaded: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const stored = await SecureStore.getItemAsync("selected_currency");
        if (stored === "USD" || stored === "LKR") {
          setCurrencyState(stored as Currency);
        }
      } catch (error) {
        console.error("Failed to load currency from SecureStore:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadCurrency();
  }, []);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    try {
      await SecureStore.setItemAsync("selected_currency", newCurrency);
    } catch (error) {
      console.error("Failed to save currency to SecureStore:", error);
    }
  };

  const toggleCurrency = () => {
    setCurrency(currency === "USD" ? "LKR" : "USD");
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, toggleCurrency, isLoaded }}>
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
