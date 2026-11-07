// ============================================================
// GrindHub — Settings Store (Zustand + Persist + Supabase Sync)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';
import { profileService } from '@/lib/services/profile-service';
import { useProfileStore } from './profile-store';

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'EUR',
  locale: 'en',
  theme: 'dark',
  defaultGameType: 'mtt',
  defaultPlatform: 'pokerstars',
  autoShareSessions: false,
};

interface SettingsState {
  settings: AppSettings;
}

interface SettingsActions {
  updateSettings: (updates: Partial<AppSettings>) => void;
  hydrateSettings: (prefs?: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },

      updateSettings: (updates) => {
        const nextSettings = { ...get().settings, ...updates };
        set({ settings: nextSettings });

        const profile = useProfileStore.getState().profile;
        if (profile?.id) {
          profileService
            .updateProfile(profile.id, { preferences: nextSettings })
            .then(() => {
              const latestProfile = useProfileStore.getState().profile;
              if (latestProfile && latestProfile.id === profile.id) {
                useProfileStore.getState().setupProfile({
                  ...latestProfile,
                  preferences: nextSettings,
                });
              }
            })
            .catch((err) => console.error('Failed to sync preferences to profile:', err));
        }
      },

      hydrateSettings: (prefs) => {
        if (!prefs) return;
        set((state) => ({
          settings: {
            ...state.settings,
            ...prefs,
          },
        }));
      },

      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),
    }),
    {
      name: 'grindhub-settings',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
