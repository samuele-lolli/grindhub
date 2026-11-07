import { supabase } from '../supabase';
import { sessionService } from './session-service';
import { bankrollService } from './bankroll-service';
import { profileService } from './profile-service';
import { useSessionStore } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useGoalsStore } from '@/stores/goals-store';
import { useProfileStore } from '@/stores/profile-store';
import type { Platform } from '@/types';

const DAY_MS = 86400000;

function daysAgoNoonIso(days: number): string {
  const d = new Date(Date.now() - days * DAY_MS);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T12:00:00.000Z`;
}

function daysFromNowNoonIso(days: number): string {
  const d = new Date(Date.now() + days * DAY_MS);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T12:00:00.000Z`;
}

export const demoService = {
  /**
   * Automatically seeds a curated, realistic set of MTT Grinder demo data
   * when a brand-new user signs in for the first time.
   */
  async seedDemoDataForNewUser(userId: string): Promise<void> {
    const psAcc = await bankrollService.createAccount(userId, {
      platform: 'pokerstars',
      name: 'PokerStars',
      balance: 2140,
      currency: 'EUR',
      category: 'poker_room',
    });
    const ggAcc = await bankrollService.createAccount(userId, {
      platform: 'ggpoker',
      name: 'GGPoker',
      balance: 1680,
      currency: 'EUR',
      category: 'poker_room',
    });
    const winaAcc = await bankrollService.createAccount(userId, {
      platform: 'winamax',
      name: 'Winamax',
      balance: 960,
      currency: 'EUR',
      category: 'poker_room',
    });
    const skrillAcc = await bankrollService.createAccount(userId, {
      platform: 'other',
      name: 'Skrill Grind Wallet',
      balance: 1500,
      currency: 'EUR',
      category: 'e_wallet',
    });
    const bankAcc = await bankrollService.createAccount(userId, {
      platform: 'other',
      name: 'Fineco Conto Personale',
      balance: 4800,
      currency: 'EUR',
      category: 'bank_account',
    });

    const { error: initTxErr } = await supabase.from('bankroll_transactions').insert([
      { user_id: userId, account_id: psAcc.id, type: 'deposit', amount: 1200, date: daysAgoNoonIso(29), notes: 'Initial Balance' },
      { user_id: userId, account_id: ggAcc.id, type: 'deposit', amount: 1000, date: daysAgoNoonIso(29), notes: 'Initial Balance' },
      { user_id: userId, account_id: winaAcc.id, type: 'deposit', amount: 600, date: daysAgoNoonIso(29), notes: 'Initial Balance' },
      { user_id: userId, account_id: skrillAcc.id, type: 'deposit', amount: 1500, date: daysAgoNoonIso(29), notes: 'Initial Balance' },
      { user_id: userId, account_id: bankAcc.id, type: 'deposit', amount: 4800, date: daysAgoNoonIso(29), notes: 'Initial Balance' },
    ]);
    if (initTxErr) throw initTxErr;

    const demoSessionsSpec: {
      daysAgo: number;
      platforms: Platform[];
      duration: number;
      eventCount: number;
      cashesCount: number;
      totalBuyIns: number;
      totalCashes: number;
      notes: string;
      splits: { accountId: string; amount: number }[];
    }[] = [
      {
        daysAgo: 26,
        platforms: ['pokerstars', 'ggpoker'],
        duration: 280,
        eventCount: 28,
        cashesCount: 6,
        totalBuyIns: 560,
        totalCashes: 880,
        notes: '[DEMO] Sessione serale MTT: 4° posto al Bounty Builder €20',
        splits: [
          { accountId: psAcc.id, amount: 220 },
          { accountId: ggAcc.id, amount: 100 },
        ],
      },
      {
        daysAgo: 22,
        platforms: ['pokerstars', 'winamax'],
        duration: 240,
        eventCount: 24,
        cashesCount: 3,
        totalBuyIns: 480,
        totalCashes: 290,
        notes: '[DEMO] Pochi spot favorevoli in late stage, persi 2 flip a 15 left',
        splits: [
          { accountId: psAcc.id, amount: -110 },
          { accountId: winaAcc.id, amount: -80 },
        ],
      },
      {
        daysAgo: 18,
        platforms: ['pokerstars', 'ggpoker', 'winamax'],
        duration: 360,
        eventCount: 36,
        cashesCount: 8,
        totalBuyIns: 780,
        totalCashes: 1420,
        notes: '[DEMO] Domenicale solido: Final Table al Mini Million e 2° nel €15 PKO!',
        splits: [
          { accountId: psAcc.id, amount: 260 },
          { accountId: ggAcc.id, amount: 280 },
          { accountId: winaAcc.id, amount: 100 },
        ],
      },
      {
        daysAgo: 14,
        platforms: ['ggpoker', 'winamax'],
        duration: 250,
        eventCount: 26,
        cashesCount: 5,
        totalBuyIns: 520,
        totalCashes: 700,
        notes: '[DEMO] Grind infrasettimanale costante, ottime taglie sui PKO',
        splits: [
          { accountId: ggAcc.id, amount: 110 },
          { accountId: winaAcc.id, amount: 70 },
        ],
      },
      {
        daysAgo: 11,
        platforms: ['pokerstars', 'ggpoker'],
        duration: 270,
        eventCount: 30,
        cashesCount: 4,
        totalBuyIns: 620,
        totalCashes: 380,
        notes: '[DEMO] Cooler KK vs AA in bolla FT sul €30 Daily',
        splits: [
          { accountId: psAcc.id, amount: -140 },
          { accountId: ggAcc.id, amount: -100 },
        ],
      },
      {
        daysAgo: 8,
        platforms: ['pokerstars', 'winamax'],
        duration: 310,
        eventCount: 32,
        cashesCount: 7,
        totalBuyIns: 640,
        totalCashes: 1050,
        notes: '[DEMO] 2° posto al Colosseum €20 e buoni piazzamenti su Winamax',
        splits: [
          { accountId: psAcc.id, amount: 280 },
          { accountId: winaAcc.id, amount: 130 },
        ],
      },
      {
        daysAgo: 6,
        platforms: ['pokerstars', 'ggpoker'],
        duration: 340,
        eventCount: 35,
        cashesCount: 8,
        totalBuyIns: 740,
        totalCashes: 1260,
        notes: '[DEMO] Grande domenica! 3° posto al €25 Sunday Special PKO',
        splits: [
          { accountId: psAcc.id, amount: 340 },
          { accountId: ggAcc.id, amount: 180 },
        ],
      },
      {
        daysAgo: 4,
        platforms: ['ggpoker', 'winamax'],
        duration: 220,
        eventCount: 22,
        cashesCount: 3,
        totalBuyIns: 440,
        totalCashes: 290,
        notes: '[DEMO] Sessione infrasettimanale corta, card dead nel finale',
        splits: [
          { accountId: ggAcc.id, amount: -90 },
          { accountId: winaAcc.id, amount: -60 },
        ],
      },
      {
        daysAgo: 2,
        platforms: ['pokerstars', 'winamax'],
        duration: 260,
        eventCount: 28,
        cashesCount: 6,
        totalBuyIns: 560,
        totalCashes: 750,
        notes: '[DEMO] Deep run sul €20 Battle Royale e ottimo ITM %',
        splits: [
          { accountId: psAcc.id, amount: 90 },
          { accountId: winaAcc.id, amount: 100 },
        ],
      },
      {
        daysAgo: 1,
        platforms: ['pokerstars', 'ggpoker', 'winamax'],
        duration: 320,
        eventCount: 34,
        cashesCount: 7,
        totalBuyIns: 700,
        totalCashes: 1000,
        notes: '[DEMO] Chiusa la settimana in spinta con FT sul €30 Bounty Hunter!',
        splits: [
          { accountId: ggAcc.id, amount: 200 },
          { accountId: winaAcc.id, amount: 100 },
        ],
      },
    ];

    const txRowsToInsert: {
      user_id: string;
      account_id: string;
      type: string;
      amount: number;
      date: string;
      notes: string;
    }[] = [];

    for (const spec of demoSessionsSpec) {
      const dateIso = daysAgoNoonIso(spec.daysAgo);
      const created = await sessionService.createSession(userId, {
        date: dateIso,
        platforms: spec.platforms,
        duration: spec.duration,
        eventCount: spec.eventCount,
        cashesCount: spec.cashesCount,
        totalBuyIns: spec.totalBuyIns,
        totalCashes: spec.totalCashes,
        notes: spec.notes,
      });

      for (const sp of spec.splits) {
        txRowsToInsert.push({
          user_id: userId,
          account_id: sp.accountId,
          type: 'session_result',
          amount: sp.amount,
          date: dateIso,
          notes: `MTT Session (${spec.eventCount} events) [sid:${created.id}]`,
        });
      }
    }

    if (txRowsToInsert.length > 0) {
      const { error: txErr } = await supabase.from('bankroll_transactions').insert(txRowsToInsert);
      if (txErr) throw txErr;
    }

    const { error: goalsErr } = await supabase.from('goals').insert([
      {
        user_id: userId,
        title: '[DEMO] Volume Mensile: 400 MTT',
        description: 'Mantenere costanza di volume sulle 3 room principali',
        type: 'volume',
        target_value: 400,
        current_value: 295,
        deadline: daysFromNowNoonIso(14),
        status: 'active',
        created_at: daysAgoNoonIso(26),
      },
      {
        user_id: userId,
        title: '[DEMO] Target Profitto: €2.500',
        description: 'Obiettivo profitto netto MTT per il mese corrente',
        type: 'profit',
        target_value: 2500,
        current_value: 1980,
        deadline: daysFromNowNoonIso(14),
        status: 'active',
        created_at: daysAgoNoonIso(26),
      },
      {
        user_id: userId,
        title: '[DEMO] Bankroll Level-Up: €6.000',
        description: 'Raggiungere €6.000 di Playable Bankroll per shot ABI €35',
        type: 'bankroll',
        target_value: 6000,
        current_value: 4780,
        deadline: daysFromNowNoonIso(30),
        status: 'active',
        created_at: daysAgoNoonIso(26),
      },
    ]);
    if (goalsErr) throw goalsErr;

    await profileService.updateProfile(userId, {
      demoStatus: 'active',
      platforms: ['pokerstars', 'ggpoker', 'winamax'],
      achievements: ['first_win', 'mtt_100', 'profit_1k', 'hours_25', 'streak_3'],
    });
  },

  /**
   * Completely wipes all sessions, bankroll accounts, transactions, goals, and achievements
   * for the user so they start 100% clean from zero (`demo_status = 'cleared'`).
   */
  async clearDemoData(userId: string): Promise<void> {
    const [txRes, sessRes, goalsRes] = await Promise.all([
      supabase.from('bankroll_transactions').delete().eq('user_id', userId),
      supabase.from('sessions').delete().eq('user_id', userId),
      supabase.from('goals').delete().eq('user_id', userId),
    ]);
    if (txRes.error) throw txRes.error;
    if (sessRes.error) throw sessRes.error;
    if (goalsRes.error) throw goalsRes.error;

    const { error: accErr } = await supabase.from('bankroll_accounts').delete().eq('user_id', userId);
    if (accErr) throw accErr;

    await profileService.updateProfile(userId, {
      demoStatus: 'cleared',
      achievements: [],
    });

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('goals-storage');
    }

    useSessionStore.getState().setSessions([]);
    useBankrollStore.getState().setAccounts([]);
    useBankrollStore.getState().setTransactions([]);
    useGoalsStore.getState().setGoals([]);
    useGoalsStore.getState().setAchievements([]);

    const currentProfile = useProfileStore.getState().profile;
    if (currentProfile) {
      useProfileStore.getState().setupProfile({
        ...currentProfile,
        demoStatus: 'cleared',
        achievements: [],
      });
    }
  },
};
