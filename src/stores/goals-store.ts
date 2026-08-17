import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  evaluateActiveGoals: () => Promise<void>;
}

type GoalsStore = GoalsState & GoalsActions;

export const useGoalsStore = create<GoalsStore>()(
  persist(
    (set, get) => ({
  goals: [],
  achievements: [],

  addGoal: async (goal) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    try {
      const newGoal = await goalsService.createGoal(userId, goal);
      set(state => ({
        goals: [newGoal, ...state.goals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }));
    } catch (error) {
      console.error('Failed to add goal:', error);
    }
  },

  updateGoal: async (id, updates) => {
    try {
      await goalsService.updateGoal(id, updates);
      set(state => ({
        goals: state.goals.map(g => g.id === id ? { ...g, ...updates } as Goal : g)
      }));
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  },

  deleteGoal: async (id) => {
    try {
      await goalsService.deleteGoal(id);
      set(state => ({
        goals: state.goals.filter(g => g.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
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

    try {
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
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  },

  evaluateActiveGoals: async () => {
    try {
      const { goals, updateProgress } = get();
      const activeGoals = goals.filter(g => g.status === 'active');
      
      // Dynamically import to avoid circular dependency
      const { useSessionStore } = await import('./session-store');
      const allSessions = useSessionStore.getState().sessions;
      
      for (const goal of activeGoals) {
        // Only count sessions that happened AFTER the goal was created (ignoring exact time)
        let goalStartDate = goal.createdAt ? new Date(goal.createdAt) : new Date();
        if (isNaN(goalStartDate.getTime()) || goalStartDate.getTime() < new Date('2020-01-01').getTime()) {
          goalStartDate = new Date(); // fallback if date is invalid or ancient
        }
        goalStartDate.setHours(0,0,0,0);
        const goalStartTime = goalStartDate.getTime();

        const relevantSessions = allSessions.filter(s => {
          const sessionDate = new Date(s.date);
          sessionDate.setHours(0,0,0,0);
          return sessionDate.getTime() >= goalStartTime;
        });
        const goalStats = useSessionStore.getState().getStats(relevantSessions);
        
        let newValue = goal.currentValue;
        
        switch (goal.type) {
          case 'profit':
            newValue = goalStats.totalProfit;
            break;
          case 'volume':
            newValue = goalStats.totalTournaments;
            break;
          case 'roi':
            newValue = goalStats.roi;
            break;
          // time and custom logic could be added here
        }

        if (newValue !== goal.currentValue) {
          await updateProgress(goal.id, newValue);
        }
      }
    } catch (error) {
      console.error('Failed to evaluate active goals:', error);
    }
  },

  checkAchievements: (stats: PlayerStats) => {
    const { achievements } = get();
    const newAchievements = [...achievements];
    let newlyUnlocked = false;

    // Evaluate First Blood
    if (stats.biggestWin > 0 && !newAchievements.find(a => a.id === 'first_win')) {
      newAchievements.push({ id: 'first_win', unlockedAt: new Date().toISOString() });
      newlyUnlocked = true;
    }
    // Evaluate Hot Streak
    if (stats.bestStreak >= 3 && !newAchievements.find(a => a.id === 'streak_3')) {
      newAchievements.push({ id: 'streak_3', unlockedAt: new Date().toISOString() });
      newlyUnlocked = true;
    }
    // Evaluate 1K Club
    if (stats.totalProfit >= 1000 && !newAchievements.find(a => a.id === 'profit_1k')) {
      newAchievements.push({ id: 'profit_1k', unlockedAt: new Date().toISOString() });
      newlyUnlocked = true;
    }
    // Evaluate The Grinder (100 hours)
    if (stats.totalHoursPlayed >= 100 && !newAchievements.find(a => a.id === 'grinder')) {
      newAchievements.push({ id: 'grinder', unlockedAt: new Date().toISOString() });
      newlyUnlocked = true;
    }
    // Evaluate ROI King
    if (stats.totalTournaments >= 50 && stats.roi >= 50 && !newAchievements.find(a => a.id === 'roi_king')) {
      newAchievements.push({ id: 'roi_king', unlockedAt: new Date().toISOString() });
      newlyUnlocked = true;
    }

    if (newlyUnlocked) {
      set({ achievements: newAchievements });
      
      // Auto-share to social if privacy allows
      const profile = useProfileStore.getState().profile;
      if (profile && profile.privacy?.autoShareGoals) {
        const newlyUnlockedDefs = newAchievements.filter(na => !achievements.find(oa => oa.id === na.id));
        newlyUnlockedDefs.forEach(na => {
          const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === na.id);
          if (def) {
            useSocialStore.getState().addPost({
              authorId: profile.id,
              type: 'milestone',
              content: `🏆 I just unlocked the "${def.name}" achievement! ${def.description}.`,
              isPublic: true
            });
          }
        });
      }
    }
  }
  }),
  {
    name: 'goals-storage',
    partialize: (state) => ({ achievements: state.achievements })
  }
));

export const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_win', name: 'First Blood', description: 'Win your first tournament', icon: 'Target' as const },
  { id: 'streak_3', name: 'Hot Streak', description: 'Cash in 3 consecutive sessions', icon: 'Flame' as const },
  { id: 'profit_1k', name: '1K Club', description: 'Reach €1,000 total profit', icon: 'Trophy' as const },
  { id: 'grinder', name: 'The Grinder', description: 'Log 100 hours of playtime', icon: 'Zap' as const },
  { id: 'roi_king', name: 'ROI King', description: 'Maintain >50% ROI over 50 events', icon: 'Award' as const },
];
