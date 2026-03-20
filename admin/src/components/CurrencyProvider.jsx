import { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  // Persist currency in localStorage
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('admin_currency') || 'USD';
  });

  useEffect(() => {
    localStorage.setItem('admin_currency', currency);
  }, [currency]);

  const toggleCurrency = () => {
    setCurrency((prev) => (prev === 'USD' ? 'LKR' : 'USD'));
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, toggleCurrency }}>
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
