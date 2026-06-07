import { create } from 'zustand';
import type { PlayerProfile } from '@/types';
import { profileService } from '@/lib/services/profile-service';

interface ProfileState {
  profile: PlayerProfile | null;
  isLoggedIn: boolean;
  players: PlayerProfile[]; // Other users in the system
}

interface ProfileActions {
  setupProfile: (profile: PlayerProfile) => void;
  updateProfile: (userId: string, updates: Partial<PlayerProfile>) => Promise<void>;
  setLoggedIn: (status: boolean) => void;
  setPlayers: (players: PlayerProfile[]) => void;
}

type ProfileStore = ProfileState & ProfileActions;

export const useProfileStore = create<ProfileStore>()((set) => ({
  profile: null,
  isLoggedIn: false,
  players: [],

  setupProfile: (profile) => set({ profile }),

  updateProfile: async (userId, updates) => {
    await profileService.updateProfile(userId, updates);
    set(state => ({
      profile: state.profile ? { ...state.profile, ...updates } : null
    }));
  },

  setLoggedIn: (status) => set({ isLoggedIn: status }),
  
  setPlayers: (players) => set({ players })
}));
