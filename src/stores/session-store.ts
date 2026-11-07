// ============================================================
// GrindHub — Session Store (Zustand)
// ============================================================

import { create } from 'zustand';
import type {
  Session,
  DateRange,
  PlayerStats,
  Platform,
} from '@/types';
import {
  getSessionProfit,
  calculateROI,
  calculateITM,
  calculateHourlyRate,
  calculateCurrentStreak,
  calculateBestStreak,
  calculateWinRate,
} from '@/lib/utils';
import { sessionService } from '@/lib/services/session-service';
import { useProfileStore } from './profile-store';
import { useGoalsStore } from './goals-store';
import { useSettingsStore } from './settings-store';
import { useSocialStore } from './social-store';

export interface SessionFilter {
  dateRange?: DateRange;
  platform?: string;
}

interface SessionState {
  sessions: Session[];
}

interface SessionActions {
  addSession: (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'> | Omit<Session, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setSessions: (sessions: Session[]) => void;
  getSessionsByFilter: (filter: SessionFilter) => Session[];
  getStats: (sessions?: Session[]) => PlayerStats;
}

type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>()((set, get) => ({
  sessions: [],

  addSession: async (session) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    try {
      const newSession = await sessionService.createSession(userId, session);
      const updatedSessions = [newSession, ...get().sessions];
      set({ sessions: updatedSessions });
      
      await useGoalsStore.getState().evaluateActiveGoals(updatedSessions).catch(console.error);
      useGoalsStore.getState().checkAchievements(get().getStats(updatedSessions));

      // Auto-share profitable session if enabled in settings
      const { autoShareSessions } = useSettingsStore.getState().settings;
      const profit = getSessionProfit(newSession);
      if (autoShareSessions && profit > 0) {
        await useSocialStore.getState().addPost({
          authorId: userId,
          type: 'session_result',
          content: `Finished a profitable MTT session (${newSession.eventCount} events, ${newSession.cashesCount} ITM)!`,
          sessionData: newSession,
          isPublic: true,
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Failed to add session:', error);
    }
  },

  updateSession: async (id, updates) => {
    try {
      await sessionService.updateSession(id, updates);
    } catch (error) {
      console.error('Failed to update session:', error);
    }
    const updatedSessions = get().sessions.map((s) =>
      s.id === id ? ({ ...s, ...updates, updatedAt: new Date().toISOString() } as Session) : s
    );
    set({ sessions: updatedSessions });
    await useGoalsStore.getState().evaluateActiveGoals(updatedSessions).catch(console.error);
    useGoalsStore.getState().checkAchievements(get().getStats(updatedSessions));
  },

  deleteSession: async (id) => {
    try {
      await sessionService.deleteSession(id);
      const updatedSessions = get().sessions.filter((s) => s.id !== id);
      set({ sessions: updatedSessions });
      await useGoalsStore.getState().evaluateActiveGoals(updatedSessions).catch(console.error);
      useGoalsStore.getState().checkAchievements(get().getStats(updatedSessions));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  },

  setSessions: (sessions) => set({ sessions }),

  getSessionsByFilter: (filter) => {
    let filtered = get().sessions;

    if (filter.dateRange) {
      const start = new Date(filter.dateRange.start).getTime();
      const end = new Date(filter.dateRange.end).getTime();
      filtered = filtered.filter((s) => {
        const d = new Date(s.date).getTime();
        return d >= start && d <= end;
      });
    }

    if (filter.platform) {
      filtered = filtered.filter((s) => s.platforms.includes(filter.platform as Platform));
    }

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  getStats: (sessionsOverride?) => {
    const sessions = sessionsOverride ?? get().sessions;

    if (sessions.length === 0) {
      return {
        totalProfit: 0,
        totalSessions: 0,
        totalTournaments: 0,
        roi: 0,
        itm: 0,
        avgBuyIn: 0,
        hourlyRate: 0,
        biggestWin: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalHoursPlayed: 0,
        winRate: 0,
      };
    }

    // Single-pass aggregation for high performance
    let totalProfit = 0;
    let totalBuyIns = 0;
    let totalMinutes = 0;
    let totalTournaments = 0;
    let cashCount = 0;
    let winCount = 0;
    let biggestWin = 0;

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const p = getSessionProfit(s);
      totalProfit += p;
      totalBuyIns += s.totalBuyIns;
      totalMinutes += s.duration;
      totalTournaments += s.eventCount;
      cashCount += s.cashesCount;
      if (p > 0) winCount++;
      if (p > biggestWin) biggestWin = p;
    }

    return {
      totalProfit,
      totalSessions: sessions.length,
      totalTournaments,
      roi: calculateROI(totalProfit, totalBuyIns),
      itm: calculateITM(cashCount, totalTournaments),
      avgBuyIn: totalTournaments > 0 ? totalBuyIns / totalTournaments : 0,
      hourlyRate: calculateHourlyRate(totalProfit, totalMinutes),
      biggestWin,
      currentStreak: calculateCurrentStreak(sessions),
      bestStreak: calculateBestStreak(sessions),
      totalHoursPlayed: totalMinutes / 60,
      winRate: calculateWinRate(winCount, sessions.length),
    };
  },
}));
