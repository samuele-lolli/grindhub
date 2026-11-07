import { supabase } from '../supabase';
import type { PlayerProfile, PlayerStats } from '@/types';

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
      achievements: data.achievements || [],
      isCurrentUser: true,
    };
  },

  /**
   * Updates specific fields of a user's profile.
   * @param id - The UUID of the user.
   * @param updates - Partial profile fields to update.
   */
  async updateProfile(id: string, updates: Partial<PlayerProfile>): Promise<void> {
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
    if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.yearsPlaying !== undefined) dbUpdates.years_playing = updates.yearsPlaying;
    if (updates.primaryGameType !== undefined) dbUpdates.primary_game_type = updates.primaryGameType;
    if (updates.preferredStakes !== undefined) dbUpdates.preferred_stakes = updates.preferredStakes;
    if (updates.platforms !== undefined) dbUpdates.platforms = updates.platforms;
    if (updates.privacy !== undefined) dbUpdates.privacy = updates.privacy;
    if (updates.achievements !== undefined) dbUpdates.achievements = updates.achievements;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
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
      achievements: d.achievements || [],
      isCurrentUser: false,
    }));
  },

  /**
   * Retrieves a public profile and their public stats.
   * Calls the get_player_public_stats RPC to respect privacy toggles on the DB side.
   * @param id - The UUID of the target user.
   */
  async fetchPublicProfile(id: string): Promise<{ profile: PlayerProfile; stats: Partial<PlayerStats> | null } | null> {
    const profile = await this.getProfile(id);
    if (!profile) return null;

    try {
      const { data, error } = await supabase.rpc('get_player_public_stats', { target_user_id: id });
      
      if (error) {
        console.error('Error fetching public stats:', error);
        return { profile, stats: null };
      }

      // Map the DB response directly, preserving nulls for privacy-hidden fields
      const stats: Partial<PlayerStats> | null = data ? {
        totalProfit: data.totalProfit,
        totalSessions: data.totalSessions,
        totalTournaments: data.totalTournaments,
        roi: data.roi,
        itm: data.itm,
        avgBuyIn: data.avgBuyIn,
        hourlyRate: data.hourlyRate,
        biggestWin: data.biggestWin,
        currentStreak: data.currentStreak,
      } : null;

      const achievements: string[] = profile.achievements || [];
      const profileWithAchievements = { ...profile, achievements };
      return { profile: profileWithAchievements, stats };
    } catch (err) {
      console.error('Unexpected error fetching public stats:', err);
      return { profile, stats: null };
    }
  }
};
