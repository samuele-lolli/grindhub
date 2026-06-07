'use client';

/**
 * Internationalisation (i18n) provider and hook for GrindHub.
 *
 * Supports `'en'` and `'it'` locales. The active locale is persisted to
 * `localStorage` under the key `grindhub-locale` and hydrated on mount.
 *
 * @module
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import en from './en.json';
import it from './it.json';

/** The full translation dictionary shape, inferred from the English bundle. */
type Translations = typeof en;

/** Supported locale codes. */
type Locale = 'en' | 'it';

/** Pre-loaded translation bundles keyed by locale. */
const translations: Record<Locale, Translations> = { en, it };

/** Shape of the value provided by `I18nContext`. */
interface I18nContextType {
  /** The currently active locale. */
  locale: Locale;
  /** The full translation dictionary for the active locale. */
  t: Translations;
  /** Switches the active locale and persists the choice. */
  setLocale: (locale: Locale) => void;
  /**
   * Resolves a dot-delimited translation key and interpolates parameters.
   * @param path   - Dot-separated key path, e.g. `"dashboard.title"`.
   * @param params - Optional key-value pairs for `{placeholder}` replacement.
   * @returns The resolved string, or the raw `path` if not found.
   */
  formatMessage: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

/**
 * I18nProvider — Provides locale state and translation helpers to the tree.
 * Wrap the application root with this provider to enable `useI18n()`.
 */
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
          value,
        );
      }
      return value;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, formatMessage }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access the current locale, translation dictionary, and helpers.
 * Must be called within an `<I18nProvider>`.
 * @returns The i18n context value.
 * @throws If called outside of `<I18nProvider>`.
 */
export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
