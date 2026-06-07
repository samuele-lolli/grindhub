'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import en from './en.json';
import it from './it.json';

type Translations = typeof en;
type Locale = 'en' | 'it';

const translations: Record<Locale, Translations> = { en, it };

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  formatMessage: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('grindhub-locale') as Locale) || 'en';
    }
    return 'en';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('grindhub-locale', newLocale);
    }
  }, []);

  const t = translations[locale];

  const formatMessage = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let value: any = translations[locale];
      for (const key of keys) {
        value = value?.[key];
      }
      if (typeof value !== 'string') return path;
      if (params) {
        return Object.entries(params).reduce(
          (str, [key, val]) => str.replace(`{${key}}`, String(val)),
          value
        );
      }
      return value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, formatMessage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
