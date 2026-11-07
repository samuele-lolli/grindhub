'use client';

/**
 * Internationalisation (i18n) provider and hook for GrindHub.
 *
 * Uses `useSyncExternalStore` so SSR and client hydration never mismatch
 * and locale switches propagate instantaneously without `setState` in `useEffect`.
 */

import React, { createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from 'react';
import en from './en.json';
import it from './it.json';

/** The full translation dictionary shape, inferred from the English bundle. */
export type Translations = typeof en;

/** Supported locale codes. */
export type Locale = 'en' | 'it';

const translations: Record<Locale, Translations> = { en, it };

const LOCALE_STORAGE_KEY = 'grindhub-locale';
const LOCALE_EVENT = 'grindhub-locale-change';

function subscribeLocale(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(LOCALE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(LOCALE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getClientLocale(): Locale {
  if (typeof window === 'undefined') return 'it';
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'en' || stored === 'it') return stored;
  return window.navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'it';
}

function getServerLocale(): Locale {
  return 'it';
}

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  formatMessage: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getClientLocale, getServerLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      window.dispatchEvent(new Event(LOCALE_EVENT));
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

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: 'en',
      t: en,
      setLocale: () => {},
      formatMessage: (str: string, params?: Record<string, string | number>) => {
        if (!params) return str;
        return Object.entries(params).reduce(
          (acc, [key, val]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)),
          str
        );
      },
    };
  }
  return ctx;
}
