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

export interface SessionFilter {
  dateRange?: DateRange;
  platform?: string;
}

interface SessionState {
  sessions: Session[];
}

interface SessionActions {
  addSession: (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'> | Omit<Session, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSession: (id: string, updates: Partial<Session>) => void; // local only for MVP
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

    const newSession = await sessionService.createSession(userId, session);
    set((state) => ({ sessions: [newSession, ...state.sessions] }));
  },

  updateSession: (id, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? ({ ...s, ...updates, updatedAt: new Date().toISOString() } as Session) : s
      ),
    })),

  deleteSession: async (id) => {
    await sessionService.deleteSession(id);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    }));
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
        avgFinishPercentile: 0,
        finalTablePercent: 0,
      };
    }

    const profits = sessions.map(getSessionProfit);
    const totalProfit = profits.reduce((a, b) => a + b, 0);

    const totalBuyIns = sessions.reduce((sum, s) => sum + s.totalBuyIns, 0);
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalTournaments = sessions.reduce((sum, s) => sum + s.eventCount, 0);
    const cashCount = sessions.reduce((sum, s) => sum + s.cashesCount, 0);

    const winCount = sessions.filter((s) => getSessionProfit(s) > 0).length;
    const biggestWin = Math.max(0, ...profits);

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
      avgFinishPercentile: 0,
      finalTablePercent: 0,
    };
  },
}));
