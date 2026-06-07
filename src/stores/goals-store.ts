import { create } from 'zustand';
import type { Goal, PlayerStats } from '@/types';
import { goalsService } from '@/lib/services/goals-service';
import { useProfileStore } from './profile-store';
import { useSocialStore } from './social-store';

/**
 * Achievement unlocked by a user.
 */
interface Achievement {
  id: string;
  unlockedAt: string;
}

interface GoalsState {
  goals: Goal[];
  achievements: Achievement[];
}

interface GoalsActions {
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setGoals: (goals: Goal[]) => void;
  updateProgress: (id: string, value: number) => Promise<void>;
  checkAchievements: (stats: PlayerStats) => void;
  evaluateActiveGoals: (stats: PlayerStats) => Promise<void>;
}

type GoalsStore = GoalsState & GoalsActions;

export const useGoalsStore = create<GoalsStore>()((set, get) => ({
  goals: [],
  achievements: [],

  addGoal: async (goal) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const newGoal = await goalsService.createGoal(userId, goal);
    set(state => ({
      goals: [newGoal, ...state.goals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }));
  },

  updateGoal: async (id, updates) => {
    await goalsService.updateGoal(id, updates);
    set(state => ({
      goals: state.goals.map(g => g.id === id ? { ...g, ...updates } as Goal : g)
    }));
  },

  deleteGoal: async (id) => {
    await goalsService.deleteGoal(id);
    set(state => ({
      goals: state.goals.filter(g => g.id !== id)
    }));
  },

  setGoals: (goals) => set({ goals }),

  updateProgress: async (id, value) => {
    const goal = get().goals.find(g => g.id === id);
    if (!goal) return;

    let newStatus = goal.status;
    let completedAt = goal.completedAt;

    if (value >= goal.targetValue && goal.status === 'active') {
      newStatus = 'completed';
      completedAt = new Date().toISOString();
    }

    const updates = {
      currentValue: value,
      status: newStatus,
      completedAt
    };

    await goalsService.updateGoal(id, updates);

    // Auto-share to social if completed
    if (newStatus === 'completed' && goal.status === 'active') {
      const profile = useProfileStore.getState().profile;
      if (profile && profile.privacy?.autoShareGoals) {
        const { addPost } = useSocialStore.getState();
        await addPost({
          authorId: profile.id,
          type: 'goal_completed',
          content: `🎯 I just crushed my goal: "${goal.title}"! Hard work pays off.`,
          data: { goalId: goal.id, goalTitle: goal.title, target: goal.targetValue },
          isPublic: true
        });
      }
    }

    set(state => ({
      goals: state.goals.map(g => g.id === id ? { ...g, ...updates } as Goal : g)
    }));
  },

  evaluateActiveGoals: async (stats: PlayerStats) => {
    const { goals, updateProgress } = get();
    const activeGoals = goals.filter(g => g.status === 'active');
    
    for (const goal of activeGoals) {
      let newValue = goal.currentValue;
      
      switch (goal.type) {
        case 'profit':
          newValue = stats.totalProfit;
          break;
        case 'volume':
          newValue = stats.totalSessions;
          break;
        case 'roi':
          newValue = stats.roi;
          break;
        // time and custom logic could be added here
      }

      if (newValue !== goal.currentValue) {
        await updateProgress(goal.id, newValue);
      }
    }
  },

  checkAchievements: (stats: PlayerStats) => {
    // Basic implementation to satisfy the type
    // In a real app, this would check stats and update unlocked achievements
    const newAchievements = [...get().achievements];
    if (stats.totalProfit >= 1000 && !newAchievements.find(a => a.id === 'profit_1k')) {
      newAchievements.push({ id: 'profit_1k', unlockedAt: new Date().toISOString() });
    }
    if (newAchievements.length > get().achievements.length) {
      set({ achievements: newAchievements });
    }
  }
}));

export const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_win', name: 'First Blood', description: 'Win your first tournament', icon: 'Target' as const },
  { id: 'streak_3', name: 'Hot Streak', description: 'Cash in 3 consecutive sessions', icon: 'Flame' as const },
  { id: 'profit_1k', name: '1K Club', description: 'Reach €1,000 total profit', icon: 'Trophy' as const },
  { id: 'grinder', name: 'The Grinder', description: 'Log 100 hours of playtime', icon: 'Zap' as const },
  { id: 'roi_king', name: 'ROI King', description: 'Maintain >50% ROI over 50 events', icon: 'Award' as const },
];
