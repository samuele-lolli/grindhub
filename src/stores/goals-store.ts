import { create } from 'zustand';
import type { Goal, GoalStatus, PlayerStats, Session } from '@/types';
import { isoToDateInput } from '@/lib/utils';
import { goalsService } from '@/lib/services/goals-service';
import { useProfileStore } from './profile-store';
import { useSocialStore } from './social-store';

/**
 * Achievement unlocked by a user.
 * Stored exclusively in `public.profiles.achievements` (no browser localStorage leak across accounts).
 */
export interface Achievement {
  id: string;
  unlockedAt: string;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: 'volume' | 'profit' | 'hours' | 'consistency';
  icon: 'Target' | 'Flame' | 'Trophy' | 'Zap' | 'Award' | 'Crown' | 'Gem' | 'Shield';
  target: number;
  unit: string;
  getValue: (stats: PlayerStats, playableBankroll?: number) => number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Volume
  {
    id: 'first_win',
    name: 'First Blood',
    description: 'Close your first profitable MTT session',
    category: 'profit',
    icon: 'Target',
    target: 1,
    unit: 'win',
    getValue: (stats) => (stats.biggestWin > 0 ? 1 : 0),
  },
  {
    id: 'mtt_100',
    name: 'Warming Up',
    description: 'Play 100 multi-table tournaments',
    category: 'volume',
    icon: 'Zap',
    target: 100,
    unit: 'MTTs',
    getValue: (stats) => stats.totalTournaments,
  },
  {
    id: 'mtt_500',
    name: 'Volume Grinder',
    description: 'Put in 500 multi-table tournaments',
    category: 'volume',
    icon: 'Flame',
    target: 500,
    unit: 'MTTs',
    getValue: (stats) => stats.totalTournaments,
  },
  {
    id: 'mtt_1000',
    name: 'Iron Multi-Tabler',
    description: 'Reach 1,000 lifetime MTTs tracked',
    category: 'volume',
    icon: 'Shield',
    target: 1000,
    unit: 'MTTs',
    getValue: (stats) => stats.totalTournaments,
  },
  // Profit & Bankroll
  {
    id: 'profit_1k',
    name: '1K Club',
    description: 'Reach 1,000 in net tournament profit',
    category: 'profit',
    icon: 'Trophy',
    target: 1000,
    unit: 'profit',
    getValue: (stats) => Math.max(0, Math.round(stats.totalProfit)),
  },
  {
    id: 'profit_5k',
    name: '5K Crusher',
    description: 'Reach 5,000 in net tournament profit',
    category: 'profit',
    icon: 'Gem',
    target: 5000,
    unit: 'profit',
    getValue: (stats) => Math.max(0, Math.round(stats.totalProfit)),
  },
  {
    id: 'profit_10k',
    name: 'High Roller',
    description: 'Cross 10,000 in net tournament profit',
    category: 'profit',
    icon: 'Crown',
    target: 10000,
    unit: 'profit',
    getValue: (stats) => Math.max(0, Math.round(stats.totalProfit)),
  },
  // Hours
  {
    id: 'hours_25',
    name: 'Dedicated',
    description: 'Log 25 hours of table time',
    category: 'hours',
    icon: 'Zap',
    target: 25,
    unit: 'hrs',
    getValue: (stats) => Math.round((stats.totalHoursPlayed || 0) * 10) / 10,
  },
  {
    id: 'grinder',
    name: 'The Grinder',
    description: 'Log 100 hours of table time',
    category: 'hours',
    icon: 'Award',
    target: 100,
    unit: 'hrs',
    getValue: (stats) => Math.round((stats.totalHoursPlayed || 0) * 10) / 10,
  },
  // Consistency & Heater
  {
    id: 'streak_3',
    name: 'Hot Streak',
    description: 'Finish 3 consecutive sessions in profit',
    category: 'consistency',
    icon: 'Flame',
    target: 3,
    unit: 'streak',
    getValue: (stats) => stats.bestStreak,
  },
  {
    id: 'streak_5',
    name: 'Unstoppable Heater',
    description: 'Finish 5 consecutive sessions in profit',
    category: 'consistency',
    icon: 'Crown',
    target: 5,
    unit: 'streak',
    getValue: (stats) => stats.bestStreak,
  },
  {
    id: 'roi_king',
    name: 'ROI King',
    description: 'Maintain >25% ROI over at least 50 MTTs',
    category: 'consistency',
    icon: 'Award',
    target: 50,
    unit: 'MTTs @ 25%+ ROI',
    getValue: (stats) => (stats.roi >= 25 ? stats.totalTournaments : Math.min(stats.totalTournaments, 25)),
  },
];

interface GoalsState {
  goals: Goal[];
  achievements: Achievement[];
}

interface GoalsActions {
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setGoals: (goals: Goal[]) => void;
  setAchievements: (achievements: Achievement[]) => void;
  updateProgress: (id: string, value: number, options?: { sampleMet?: boolean }) => Promise<void>;
  checkAchievements: (stats: PlayerStats, playableBankroll?: number) => void;
  evaluateActiveGoals: (sessionsOverride?: Session[]) => Promise<void>;
}

type GoalsStore = GoalsState & GoalsActions;

export const useGoalsStore = create<GoalsStore>()((set, get) => ({
  goals: [],
  achievements: [],

  addGoal: async (goal) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) throw new Error('User not authenticated');

    try {
      const newGoal = await goalsService.createGoal(userId, goal);
      set((state) => ({
        goals: [newGoal, ...state.goals].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }));
      await get().evaluateActiveGoals();
    } catch (error) {
      console.error('Failed to add goal:', error);
      throw error;
    }
  },

  updateGoal: async (id, updates) => {
    try {
      await goalsService.updateGoal(id, updates);
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? ({ ...g, ...updates } as Goal) : g)),
      }));
      await get().evaluateActiveGoals();
    } catch (error) {
      console.error('Failed to update goal:', error);
      throw error;
    }
  },

  deleteGoal: async (id) => {
    try {
      await goalsService.deleteGoal(id);
      set((state) => ({
        goals: state.goals.filter((g) => g.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete goal:', error);
      throw error;
    }
  },

  setGoals: (goals) => set({ goals }),
  setAchievements: (achievements) => set({ achievements }),

  updateProgress: async (id, value, options) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal || goal.status === 'paused') return;

    const sampleMet = options?.sampleMet ?? true;
    const targetReached = sampleMet && value >= goal.targetValue;
    const todayStr = isoToDateInput(new Date().toISOString());
    const deadlineStr = goal.deadline ? isoToDateInput(goal.deadline) : '';
    const isPastDeadline = Boolean(deadlineStr && todayStr > deadlineStr);

    let newStatus: GoalStatus = goal.status;
    let completedAt = goal.completedAt;

    if (targetReached) {
      if (goal.status !== 'completed') {
        newStatus = 'completed';
        completedAt = new Date().toISOString();
      }
    } else if (isPastDeadline) {
      newStatus = 'failed';
      completedAt = undefined;
    } else {
      newStatus = 'active';
      completedAt = undefined;
    }

    if (
      newStatus === goal.status &&
      value === goal.currentValue &&
      completedAt === goal.completedAt
    ) {
      return;
    }

    const updates: Partial<Goal> = {
      currentValue: value,
      status: newStatus,
      completedAt,
    };

    try {
      await goalsService.updateGoal(id, updates);

      // Auto-share to social ONLY when transitioning to completed and NOT in Demo Mode
      if (newStatus === 'completed' && goal.status !== 'completed') {
        const profile = useProfileStore.getState().profile;
        if (profile && profile.privacy?.autoShareGoals && profile.demoStatus !== 'active') {
          await useSocialStore
            .getState()
            .addPost({
              authorId: profile.id,
              type: 'goal_completed',
              content: `🎯 I just crushed my goal: "${goal.title}"! Hard work pays off.`,
              data: { goalId: goal.id, goalTitle: goal.title, target: goal.targetValue },
              isPublic: true,
            })
            .catch(console.error);
        }
      }

      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? ({ ...g, ...updates } as Goal) : g)),
      }));
    } catch (error) {
      console.error('Failed to update progress:', error);
      throw error;
    }
  },

  evaluateActiveGoals: async (sessionsOverride?: Session[]) => {
    try {
      const { goals, updateProgress } = get();
      const evaluableGoals = goals.filter((g) => g.status !== 'paused');
      if (evaluableGoals.length === 0) return;

      let allSessions = sessionsOverride;
      const { useSessionStore } = await import('./session-store');
      const { useBankrollStore } = await import('./bankroll-store');

      if (!allSessions) {
        allSessions = useSessionStore.getState().sessions;
      }
      const getStatsFn = useSessionStore.getState().getStats;
      const playableBankroll = useBankrollStore.getState().getTotalBankroll(true);

      for (const goal of evaluableGoals) {
        const startDay = goal.createdAt ? isoToDateInput(goal.createdAt) : '2020-01-01';
        const endDay = goal.deadline ? isoToDateInput(goal.deadline) : '';

        const relevantSessions = allSessions.filter((s) => {
          const sDay = isoToDateInput(s.date);
          if (sDay < startDay) return false;
          if (endDay && sDay > endDay) return false;
          return true;
        });
        const goalStats = getStatsFn(relevantSessions);

        let newValue = goal.currentValue;
        let sampleMet = true;

        switch (goal.type) {
          case 'profit':
            newValue = Math.round(goalStats.totalProfit * 100) / 100;
            break;
          case 'volume':
            newValue = goalStats.totalTournaments;
            break;
          case 'roi':
            newValue = Math.round(goalStats.roi * 10) / 10;
            sampleMet = goalStats.totalTournaments >= 10;
            break;
          case 'time':
            newValue = Math.round((goalStats.totalHoursPlayed || 0) * 10) / 10;
            break;
          case 'bankroll':
            newValue = Math.round(playableBankroll * 100) / 100;
            break;
          case 'custom':
            newValue = goal.currentValue;
            break;
        }

        if (typeof newValue !== 'number' || isNaN(newValue) || !isFinite(newValue)) {
          newValue = 0;
        }

        await updateProgress(goal.id, newValue, { sampleMet });
      }
    } catch (error) {
      console.error('Failed to evaluate active goals:', error);
    }
  },

  checkAchievements: (stats: PlayerStats, playableBankroll = 0) => {
    const { achievements } = get();
    const newAchievements = [...achievements];
    let newlyUnlocked = false;

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const currentVal = def.getValue(stats, playableBankroll);
      const isUnlocked =
        def.id === 'roi_king'
          ? stats.totalTournaments >= 50 && stats.roi >= 25
          : currentVal >= def.target;

      if (isUnlocked && !newAchievements.some((a) => a.id === def.id)) {
        newAchievements.push({ id: def.id, unlockedAt: new Date().toISOString() });
        newlyUnlocked = true;
      }
    }

    if (newlyUnlocked) {
      set({ achievements: newAchievements });

      const profile = useProfileStore.getState().profile;
      if (profile) {
        const achievementIds = newAchievements.map((a) => a.id);
        useProfileStore
          .getState()
          .updateProfile(profile.id, { achievements: achievementIds })
          .catch(console.error);
      }

      if (profile && profile.privacy?.autoShareGoals && profile.demoStatus !== 'active') {
        const newlyUnlockedDefs = newAchievements.filter(
          (na) => !achievements.find((oa) => oa.id === na.id)
        );
        newlyUnlockedDefs.forEach((na) => {
          const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === na.id);
          if (def) {
            useSocialStore
              .getState()
              .addPost({
                authorId: profile.id,
                type: 'milestone',
                content: `🏆 I just unlocked the "${def.name}" achievement! ${def.description}.`,
                isPublic: true,
              })
              .catch(console.error);
          }
        });
      }
    }
  },
}));
