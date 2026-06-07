// ============================================================
// GrindHub — Settings Store (Zustand + Persist)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';

// --- Default Settings ---

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'EUR',
  locale: 'en',
  theme: 'dark',
  defaultGameType: 'mtt',
  defaultPlatform: 'pokerstars',
  autoShareSessions: false,
};

// --- Store Interface ---

interface SettingsState {
  settings: AppSettings;
}

interface SettingsActions {
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

// --- Store ---

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // ── State ──
      settings: { ...DEFAULT_SETTINGS },

      // ── Actions ──
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      resetSettings: () =>
        set({ settings: { ...DEFAULT_SETTINGS } }),
    }),
    {
      name: 'grindhub-settings',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
