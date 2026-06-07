import { supabase } from '../supabase';
import type { Goal, GoalType, GoalStatus } from '@/types';

/**
 * Service for managing user goals via Supabase.
 * Connects directly to the 'goals' table.
 */
export const goalsService = {
  /**
   * Retrieves all goals for a specific user.
   * @param userId - The UUID of the user.
   * @returns A promise resolving to an array of Goal objects.
   */
  async fetchGoals(userId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      title: d.title,
      description: d.description || '',
      type: d.type as GoalType,
      targetValue: Number(d.target_value),
      currentValue: Number(d.current_value),
      deadline: d.deadline || '',
      status: d.status as GoalStatus,
      createdAt: d.created_at,
      completedAt: d.completed_at || undefined,
    }));
  },

  /**
   * Creates a new goal for a user.
   * @param userId - The UUID of the user owning the goal.
   * @param goal - The details of the goal to create.
   * @returns A promise resolving to the created Goal.
   */
  async createGoal(userId: string, goal: Omit<Goal, 'id' | 'createdAt' | 'completedAt'>): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: goal.title,
        description: goal.description,
        type: goal.type,
        target_value: goal.targetValue,
        current_value: goal.currentValue,
        deadline: goal.deadline || null,
        status: goal.status,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      type: data.type as GoalType,
      targetValue: Number(data.target_value),
      currentValue: Number(data.current_value),
      deadline: data.deadline || '',
      status: data.status as GoalStatus,
      createdAt: data.created_at,
      completedAt: data.completed_at || undefined,
    };
  },

  /**
   * Updates an existing goal. This can be used to increment progress or change goal status.
   * @param id - The UUID of the goal.
   * @param updates - Partial Goal object containing the fields to update.
   */
  async updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
    const dbUpdates: Record<string, string | number | null> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.targetValue !== undefined) dbUpdates.target_value = updates.targetValue;
    if (updates.currentValue !== undefined) dbUpdates.current_value = updates.currentValue;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline || null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt || null;

    const { error } = await supabase
      .from('goals')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Permanently deletes a goal.
   * @param id - The UUID of the goal to delete.
   */
  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
