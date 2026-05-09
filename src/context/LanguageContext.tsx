import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { translations } from '../i18n/translations';

type Language = 'fr' | 'en' | 'ru';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, any>) => string;
  formatNumber: (value: number, currency?: string) => string;
  formatDate: (date: string | number | Date) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('flashpay_lang');
      if (saved && ['fr', 'en', 'ru'].includes(saved)) {
        return saved as Language;
      }
    } catch (e) {
      console.error('Error reading language from localStorage', e);
    }
    return 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('flashpay_lang', lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = React.useCallback((key: string, vars?: Record<string, any>) => {
    const dict = translations[language] || translations['fr'];
    let text = dict[key] || key;

    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [language]);

  const formatNumber = React.useCallback((value: number, currency?: string) => {
    const locale = language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'fr-FR';
    const options: Intl.NumberFormatOptions = currency ? { style: 'currency', currency } : {};
    return new Intl.NumberFormat(locale, options).format(value);
  }, [language]);

  const formatDate = React.useCallback((d: any) => {
    try {
      // Handle Firestore Timestamp objects
      const date = d?.toDate ? d.toDate() : d instanceof Date ? d : new Date(d);
      const locale = language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'fr-FR';
      return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
    } catch (e) {
      return '—';
    }
  }, [language]);

  const value = React.useMemo(() => ({
    language,
    setLanguage,
    t,
    formatNumber,
    formatDate
  }), [language, setLanguage, t, formatNumber, formatDate]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
