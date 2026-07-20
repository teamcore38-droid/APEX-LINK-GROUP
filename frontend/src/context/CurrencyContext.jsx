import { createContext, useContext, useEffect, useState } from 'react';

export const CURRENCIES = [
  { code: 'LKR', symbol: 'Rs.', flag: '🇱🇰', name: 'Sri Lankan Rupee' },
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', flag: '🇦🇺', name: 'Australian Dollar' },
];

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(() => {
    const saved = localStorage.getItem('apex_currency');
    return CURRENCIES.some((c) => c.code === saved) ? saved : 'LKR';
  });

  useEffect(() => {
    localStorage.setItem('apex_currency', currency);
  }, [currency]);

  const setCurrency = (newCurrency) => {
    if (CURRENCIES.some((c) => c.code === newCurrency)) {
      setCurrencyState(newCurrency);
    }
  };

  const selectedCurrencyObj = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        selectedCurrencyObj,
        currencies: CURRENCIES,
      }}
    >
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
