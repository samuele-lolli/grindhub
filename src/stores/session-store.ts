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
  calculateMaxDrawdown,
  calculateWinRate,
  sortSessionsDesc,
  isoToDateInput,
} from '@/lib/utils';
import { sessionService } from '@/lib/services/session-service';
import { useProfileStore } from './profile-store';
import { useGoalsStore } from './goals-store';
import { useSettingsStore } from './settings-store';
import { useSocialStore } from './social-store';
import { useBankrollStore } from './bankroll-store';

export interface SessionFilter {
  dateRange?: DateRange;
  platform?: string;
}

export interface SessionBankrollSyncItem {
  accountId: string;
  amount: number;
}

interface SessionState {
  sessions: Session[];
}

interface SessionActions {
  addSession: (
    session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'> | Omit<Session, 'createdAt' | 'updatedAt'>,
    bankrollSync?: SessionBankrollSyncItem[]
  ) => Promise<void>;
  updateSession: (
    id: string,
    updates: Partial<Session>,
    bankrollSync?: SessionBankrollSyncItem[]
  ) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setSessions: (sessions: Session[]) => void;
  getSessionsByFilter: (filter: SessionFilter) => Session[];
  getStats: (sessions?: Session[]) => PlayerStats;
}

type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>()((set, get) => ({
  sessions: [],

  addSession: async (session, bankrollSync) => {
    const profile = useProfileStore.getState().profile;
    const userId = profile?.id;
    if (!userId) throw new Error('User not authenticated');

    try {
      const newSession = await sessionService.createSession(userId, session);
      const updatedSessions = sortSessionsDesc([newSession, ...get().sessions]);
      set({ sessions: updatedSessions });

      // Sync session result to Bankroll accounts if requested
      if (bankrollSync && bankrollSync.length > 0) {
        const { addTransaction } = useBankrollStore.getState();
        for (const item of bankrollSync) {
          if (item.accountId && Math.abs(item.amount) > 0.001) {
            await addTransaction({
              accountId: item.accountId,
              type: 'session_result',
              amount: Math.round(item.amount * 100) / 100,
              date: newSession.date,
              notes: `MTT Session (${newSession.eventCount} events)`,
              sessionId: newSession.id,
            });
          }
        }
      }

      const playableBankroll = useBankrollStore.getState().getTotalBankroll(true);
      await useGoalsStore.getState().evaluateActiveGoals(updatedSessions).catch(console.error);
      useGoalsStore.getState().checkAchievements(get().getStats(updatedSessions), playableBankroll);

      // Auto-share profitable session ONLY when not in Demo Mode
      const { autoShareSessions } = useSettingsStore.getState().settings;
      const profit = getSessionProfit(newSession);
      if (autoShareSessions && profit > 0 && profile?.demoStatus !== 'active') {
        const showProfit = profile?.privacy?.showProfit ?? true;
        const safeSessionSnapshot = showProfit
          ? newSession
          : {
              id: newSession.id,
              date: newSession.date,
              platforms: newSession.platforms,
              duration: newSession.duration,
              eventCount: newSession.eventCount,
              cashesCount: newSession.cashesCount,
            };

        await useSocialStore
          .getState()
          .addPost({
            authorId: userId,
            type: 'session_result',
            content: `Finished a profitable MTT session (${newSession.eventCount} events, ${newSession.cashesCount} ITM)!`,
            sessionData: safeSessionSnapshot,
            isPublic: true,
          })
          .catch(console.error);
      }
    } catch (error) {
      console.error('Failed to add session:', error);
      throw error;
    }
  },

  updateSession: async (id, updates, bankrollSync) => {
    try {
      await sessionService.updateSession(id, updates);

      const updatedSessions = sortSessionsDesc(
        get().sessions.map((s) =>
          s.id === id ? ({ ...s, ...updates, updatedAt: new Date().toISOString() } as Session) : s
        )
      );
      set({ sessions: updatedSessions });

      // If bankrollSync is passed, replace any previous linked transactions for this session
      if (bankrollSync !== undefined) {
        const { transactions, deleteTransaction, addTransaction } = useBankrollStore.getState();
        const linkedTxs = transactions.filter((t) => t.sessionId === id);
        for (const tx of linkedTxs) {
          await deleteTransaction(tx.id);
        }
        const targetSession = updatedSessions.find((s) => s.id === id);
        for (const item of bankrollSync) {
          if (item.accountId && Math.abs(item.amount) > 0.001) {
            await addTransaction({
              accountId: item.accountId,
              type: 'session_result',
              amount: Math.round(item.amount * 100) / 100,
              date: targetSession?.date || new Date().toISOString(),
              notes: `MTT Session (${targetSession?.eventCount || 0} events)`,
              sessionId: id,
            });
          }
        }
      }

      const playableBankroll = useBankrollStore.getState().getTotalBankroll(true);
      await useGoalsStore.getState().evaluateActiveGoals(updatedSessions).catch(console.error);
      useGoalsStore.getState().checkAchievements(get().getStats(updatedSessions), playableBankroll);
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  },

  deleteSession: async (id) => {
    try {
      await sessionService.deleteSession(id);
      const updatedSessions = get().sessions.filter((s) => s.id !== id);
      set({ sessions: updatedSessions });

      // Automatically reverse any bankroll transactions linked to this session
      const { transactions, deleteTransaction } = useBankrollStore.getState();
      const linkedTxs = transactions.filter((t) => t.sessionId === id);
      for (const tx of linkedTxs) {
        await deleteTransaction(tx.id);
      }

      const playableBankroll = useBankrollStore.getState().getTotalBankroll(true);
      await useGoalsStore.getState().evaluateActiveGoals(updatedSessions).catch(console.error);
      useGoalsStore.getState().checkAchievements(get().getStats(updatedSessions), playableBankroll);
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  },

  setSessions: (sessions) => set({ sessions: sortSessionsDesc(sessions) }),

  getSessionsByFilter: (filter) => {
    let filtered = get().sessions;

    if (filter.dateRange) {
      const startDay = filter.dateRange.start.split('T')[0];
      const endDay = filter.dateRange.end.split('T')[0];
      filtered = filtered.filter((s) => {
        const d = isoToDateInput(s.date);
        return (!startDay || d >= startDay) && (!endDay || d <= endDay);
      });
    }

    if (filter.platform) {
      filtered = filtered.filter((s) => s.platforms.includes(filter.platform as Platform));
    }

    return sortSessionsDesc(filtered);
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
        worstLoss: 0,
        maxDrawdown: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalHoursPlayed: 0,
        winRate: 0,
      };
    }

    let totalProfit = 0;
    let totalBuyIns = 0;
    let totalMinutes = 0;
    let totalTournaments = 0;
    let cashCount = 0;
    let winCount = 0;
    let biggestWin = 0;
    let worstLoss = 0;

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
      if (p < worstLoss) worstLoss = p;
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
      worstLoss,
      maxDrawdown: calculateMaxDrawdown(sessions),
      currentStreak: calculateCurrentStreak(sessions),
      bestStreak: calculateBestStreak(sessions),
      totalHoursPlayed: totalMinutes / 60,
      winRate: calculateWinRate(winCount, sessions.length),
    };
  },
}));
