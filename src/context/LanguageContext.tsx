import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { translations } from '../i18n/translations';

type Language = 'fr' | 'en';
type FontSize = 'tiny' | 'small' | 'normal';
type Theme = 'light' | 'dark' | 'system';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string, vars?: Record<string, any>) => string;
  formatNumber: (value: number, currency?: string) => string;
  formatDate: (date: string | number | Date) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const FONT_SIZE_MAP = {
  tiny: '12px',
  small: '14px',
  normal: '16px',
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('flashpay_lang');
      if (saved && ['fr', 'en'].includes(saved)) {
        return saved as Language;
      }
    } catch (e) {
      console.error('Error reading language from localStorage', e);
    }
    return 'fr';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    try {
      const saved = localStorage.getItem('flashpay_font_size');
      if (saved && ['tiny', 'small', 'normal'].includes(saved)) {
        return saved as FontSize;
      }
    } catch (e) {
      console.error('Error reading font size from localStorage', e);
    }
    return 'small';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('flashpay_theme');
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved as Theme;
      }
    } catch (e) {
      console.error('Error reading theme from localStorage', e);
    }
    return 'light';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('flashpay_lang', lang);
    document.documentElement.lang = lang;
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem('flashpay_font_size', size);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('flashpay_theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize];
  }, [fontSize]);

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const t = React.useCallback((key: string, vars?: Record<string, any>) => {
    const dict = translations[language] || translations['fr'];
    let text = dict[key] || key.replace(/_/g, ' ');

    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [language]);

  const formatNumber = React.useCallback((value: number, currency?: string) => {
    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    const options: Intl.NumberFormatOptions = currency ? { style: 'currency', currency } : {};
    return new Intl.NumberFormat(locale, options).format(value);
  }, [language]);

  const formatDate = React.useCallback((d: any) => {
    try {
      // Handle Firestore Timestamp objects
      const date = d?.toDate ? d.toDate() : d instanceof Date ? d : new Date(d);
      const locale = language === 'en' ? 'en-US' : 'fr-FR';
      return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
    } catch (e) {
      return '—';
    }
  }, [language]);

  const value = React.useMemo(() => ({
    language,
    setLanguage,
    fontSize,
    setFontSize,
    theme,
    setTheme,
    t,
    formatNumber,
    formatDate
  }), [language, fontSize, theme, t, formatNumber, formatDate]);

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
