import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../lib/axios';

const CurrencyContext = createContext();

/**
 * CurrencyProvider — drives currency from backend settings.
 * No client-side toggle. The store's configured currency is the single source of truth.
 */
export const CurrencyProvider = ({ children }) => {
  const { data: settings } = useQuery({
    queryKey: ['store-settings-currency'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/settings');
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });

  // Derive currency from backend settings, fallback to LKR
  const currency = settings?.localization?.currency || 'LKR';
  const currencySymbol = settings?.localization?.currencySymbol || 'Rs.';

  return (
    <CurrencyContext.Provider value={{ currency, currencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
