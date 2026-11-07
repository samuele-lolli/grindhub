import { supabase } from '../supabase';
import type { PlayerProfile, PlayerStats, AppSettings } from '@/types';

const DEFAULT_PRIVACY = {
  showProfit: true,
  showROI: true,
  showITM: true,
  showVolume: true,
  showAvgBuyIn: true,
  showHourlyRate: true,
  showBiggestWin: true,
  showCurrentStreak: true,
  autoShareGoals: false,
};

function mapProfileRow(data: Record<string, unknown>, isCurrentUser: boolean): PlayerProfile {
  const rawPrivacy = (data.privacy as Record<string, unknown>) || {};
  return {
    id: String(data.id),
    username: String(data.username || ''),
    displayName: String(data.display_name || ''),
    avatar: String(data.avatar_url || ''),
    bio: String(data.bio || ''),
    country: String(data.country || ''),
    yearsPlaying: Number(data.years_playing || 0),
    primaryGameType: (data.primary_game_type as PlayerProfile['primaryGameType']) || 'mtt',
    preferredStakes: String(data.preferred_stakes || ''),
    platforms: (data.platforms as PlayerProfile['platforms']) || [],
    joinedAt: String(data.created_at || new Date().toISOString()),
    privacy: {
      showProfit: Boolean(rawPrivacy.showProfit ?? DEFAULT_PRIVACY.showProfit),
      showROI: Boolean(rawPrivacy.showROI ?? DEFAULT_PRIVACY.showROI),
      showITM: Boolean(rawPrivacy.showITM ?? DEFAULT_PRIVACY.showITM),
      showVolume: Boolean(rawPrivacy.showVolume ?? DEFAULT_PRIVACY.showVolume),
      showAvgBuyIn: Boolean(rawPrivacy.showAvgBuyIn ?? DEFAULT_PRIVACY.showAvgBuyIn),
      showHourlyRate: Boolean(rawPrivacy.showHourlyRate ?? DEFAULT_PRIVACY.showHourlyRate),
      showBiggestWin: Boolean(rawPrivacy.showBiggestWin ?? DEFAULT_PRIVACY.showBiggestWin),
      showCurrentStreak: Boolean(rawPrivacy.showCurrentStreak ?? DEFAULT_PRIVACY.showCurrentStreak),
      autoShareGoals: Boolean(rawPrivacy.autoShareGoals ?? DEFAULT_PRIVACY.autoShareGoals),
    },
    preferences: (data.preferences as Partial<AppSettings>) || undefined,
    achievements: (data.achievements as string[]) || [],
    demoStatus: (data.demo_status as PlayerProfile['demoStatus']) || 'uninitialized',
    isCurrentUser,
  };
}

/**
 * Service for managing user profiles and settings via Supabase.
 */
export const profileService = {
  async getProfile(id: string): Promise<PlayerProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapProfileRow(data as Record<string, unknown>, true);
  },

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
    if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences;
    if (updates.achievements !== undefined) dbUpdates.achievements = updates.achievements;
    if (updates.demoStatus !== undefined) dbUpdates.demo_status = updates.demoStatus;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Searches public profiles safely, stripping PostgREST `.or()` metacharacters.
   */
  async searchPlayers(query: string): Promise<PlayerProfile[]> {
    const safeQuery = query.trim().replace(/[,()%*\\]/g, '');
    let req = supabase.from('profiles').select('*');
    if (safeQuery) {
      req = req.or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`);
    }
    const { data, error } = await req.order('created_at', { ascending: false }).limit(30);

    if (error || !data) return [];
    return data.map(d => mapProfileRow(d as Record<string, unknown>, false));
  },

  async fetchPublicProfile(id: string): Promise<{ profile: PlayerProfile; stats: Partial<PlayerStats> | null } | null> {
    const profile = await this.getProfile(id);
    if (!profile) return null;

    try {
      const { data, error } = await supabase.rpc('get_player_public_stats', { target_user_id: id });

      if (error) {
        console.error('Error fetching public stats:', error);
        return { profile: { ...profile, isCurrentUser: false }, stats: null };
      }

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

      return {
        profile: { ...profile, achievements: profile.achievements || [], isCurrentUser: false },
        stats,
      };
    } catch (err) {
      console.error('Unexpected error fetching public stats:', err);
      return { profile: { ...profile, isCurrentUser: false }, stats: null };
    }
  },
};
