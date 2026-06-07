import { supabase } from '../supabase';
import type { PlayerProfile } from '@/types';

/**
 * Service for managing user profiles and settings via Supabase.
 * Interacts with the 'profiles' table.
 */
export const profileService = {
  /**
   * Retrieves a user's profile by their unique ID.
   * @param id - The UUID of the user.
   * @returns A promise resolving to the PlayerProfile, or null if not found.
   */
  async getProfile(id: string): Promise<PlayerProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      avatar: data.avatar_url || '',
      bio: data.bio || '',
      country: data.country || '',
      yearsPlaying: data.years_playing || 0,
      primaryGameType: data.primary_game_type || 'mtt',
      preferredStakes: data.preferred_stakes || '',
      platforms: data.platforms || [],
      joinedAt: data.created_at,
      privacy: data.privacy,
      isCurrentUser: true,
    };
  },

  /**
   * Updates specific fields of a user's profile.
   * @param id - The UUID of the user.
   * @param updates - Partial profile fields to update.
   */
  async updateProfile(id: string, updates: Partial<PlayerProfile>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: updates.username,
        display_name: updates.displayName,
        avatar_url: updates.avatar,
        bio: updates.bio,
        country: updates.country,
        years_playing: updates.yearsPlaying,
        primary_game_type: updates.primaryGameType,
        preferred_stakes: updates.preferredStakes,
        platforms: updates.platforms,
        privacy: updates.privacy,
      })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Retrieves all public profiles across the platform for social features (like search and leaderboards).
   * Note: This currently fetches all profiles, which is suitable for MVP but should be paginated for large userbases.
   * @returns A promise resolving to an array of PlayerProfile objects.
   */
  async searchPlayers(query: string): Promise<PlayerProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .limit(20);

    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      username: d.username,
      displayName: d.display_name,
      avatar: d.avatar_url || '',
      bio: d.bio || '',
      country: d.country || '',
      yearsPlaying: d.years_playing || 0,
      primaryGameType: d.primary_game_type || 'mtt',
      preferredStakes: d.preferred_stakes || '',
      platforms: d.platforms || [],
      joinedAt: d.created_at,
      privacy: d.privacy,
      isCurrentUser: false,
    }));
  }
};
