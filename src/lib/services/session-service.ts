import { supabase } from '../supabase';
import type { Session } from '@/types';

/**
 * Service for managing user poker sessions via Supabase.
 * Connects directly to the 'sessions' table.
 */
export const sessionService = {
  /**
   * Retrieves all sessions for a specific user.
   * @param userId - The UUID of the user.
   * @returns A promise resolving to an array of Session objects.
   */
  async fetchSessions(userId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      date: d.date,
      platforms: d.platforms,
      duration: d.duration,
      eventCount: d.event_count,
      cashesCount: d.cashes_count,
      totalBuyIns: Number(d.total_buy_ins),
      totalCashes: Number(d.total_cashes),
      notes: d.notes || '',
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  },

  /**
   * Creates a new session.
   * @param userId - The UUID of the user owning the session.
   * @param session - The session details excluding ID and timestamps.
   * @returns A promise resolving to the created Session.
   */
  async createSession(userId: string, session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        date: session.date,
        platforms: session.platforms,
        duration: session.duration,
        event_count: session.eventCount,
        cashes_count: session.cashesCount,
        total_buy_ins: session.totalBuyIns,
        total_cashes: session.totalCashes,
        notes: session.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      date: data.date,
      platforms: data.platforms,
      duration: data.duration,
      eventCount: data.event_count,
      cashesCount: data.cashes_count,
      totalBuyIns: Number(data.total_buy_ins),
      totalCashes: Number(data.total_cashes),
      notes: data.notes || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  /**
   * Permanently deletes a session.
   * @param id - The UUID of the session to delete.
   */
  async deleteSession(id: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Updates an existing session.
   * @param id - The UUID of the session to update.
   * @param updates - Partial Session object containing the fields to update.
   */
  async updateSession(id: string, updates: Partial<Session>): Promise<void> {
    const dbUpdates: Record<string, any> = {};
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.platforms) dbUpdates.platforms = updates.platforms;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.eventCount !== undefined) dbUpdates.event_count = updates.eventCount;
    if (updates.cashesCount !== undefined) dbUpdates.cashes_count = updates.cashesCount;
    if (updates.totalBuyIns !== undefined) dbUpdates.total_buy_ins = updates.totalBuyIns;
    if (updates.totalCashes !== undefined) dbUpdates.total_cashes = updates.totalCashes;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase
      .from('sessions')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  }
};
