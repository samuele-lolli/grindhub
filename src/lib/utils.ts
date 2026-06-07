// ============================================================
// GrindHub — Utility Functions & Poker Math
// ============================================================

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import type {
  Session,
  Currency,
  GameType,
  Platform,
  TournamentStructure,
  TournamentType,
  TimeFilter,
  BankrollHealthStatus,
} from '@/types';

// --- ID Generation ---

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- Currency Formatting ---

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatCurrency(
  amount: number,
  currency: Currency = 'EUR',
  showSign = false
): string {
  const symbol = currencySymbols[currency];
  const absAmount = Math.abs(amount);
  const formatted =
    absAmount >= 1000
      ? absAmount.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      : absAmount.toFixed(2);

  const sign = amount >= 0 ? (showSign ? '+' : '') : '-';
  return `${sign}${symbol}${formatted}`;
}

export function formatCompactCurrency(amount: number, currency: Currency = 'EUR'): string {
  const symbol = currencySymbols[currency];
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${symbol}${abs.toFixed(0)}`;
}

// --- Number Formatting ---

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// --- Date Formatting ---

export function formatDate(dateStr: string, locale: 'en' | 'it' = 'en'): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return 'Invalid date';
  return format(date, 'MMM d, yyyy', { locale: locale === 'it' ? it : enUS });
}

export function formatDateTime(dateStr: string, locale: 'en' | 'it' = 'en'): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return 'Invalid date';
  return format(date, 'MMM d, yyyy HH:mm', { locale: locale === 'it' ? it : enUS });
}

export function formatRelativeTime(dateStr: string, locale: 'en' | 'it' = 'en'): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return 'Invalid date';
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: locale === 'it' ? it : enUS,
  });
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// --- Poker Math ---

export function calculateROI(totalProfit: number, totalBuyIns: number): number {
  if (totalBuyIns === 0) return 0;
  return (totalProfit / totalBuyIns) * 100;
}

export function calculateITM(cashCount: number, totalTournaments: number): number {
  if (totalTournaments === 0) return 0;
  return (cashCount / totalTournaments) * 100;
}

export function calculateHourlyRate(totalProfit: number, totalMinutes: number): number {
  if (totalMinutes === 0) return 0;
  return totalProfit / (totalMinutes / 60);
}

export function calculateWinRate(winCount: number, totalSessions: number): number {
  if (totalSessions === 0) return 0;
  return (winCount / totalSessions) * 100;
}

// --- Session Profit Calculation ---

export function getSessionProfit(session: Session): number {
  return session.totalCashes - session.totalBuyIns;
}

export function getSessionBuyIn(session: Session): number {
  if (session.eventCount && session.eventCount > 0) {
    return session.totalBuyIns / session.eventCount;
  }
  return session.totalBuyIns;
}

export function isSessionProfitable(session: Session): boolean {
  return getSessionProfit(session) > 0;
}

// --- Bankroll Health ---

export function getBankrollHealth(
  bankroll: number,
  avgBuyIn: number,
  gameType: GameType
): BankrollHealthStatus {
  const recommendedBuyIns: Record<GameType, number> = {
    mtt: 100,
    cash: 30,
    sng: 50,
    spin: 50,
  };

  const recommended = recommendedBuyIns[gameType];
  const ratio = avgBuyIn > 0 ? bankroll / avgBuyIn : Infinity;

  if (ratio >= recommended) return 'healthy';
  if (ratio >= recommended * 0.5) return 'caution';
  return 'danger';
}

export function getRecommendedBuyIns(gameType: GameType): number {
  const map: Record<GameType, number> = { mtt: 100, cash: 30, sng: 50, spin: 50 };
  return map[gameType];
}

// --- Label Helpers ---

export const gameTypeLabels: Record<GameType, string> = {
  mtt: 'MTT',
  cash: 'Cash Game',
  sng: 'Sit & Go',
  spin: 'Spin & Go',
};

export const platformLabels: Record<Platform, string> = {
  pokerstars: 'PokerStars',
  ggpoker: 'GGPoker',
  '888poker': '888poker',
  winamax: 'Winamax',
  partypoker: 'partypoker',
  natural8: 'Natural8',
  wpn: 'WPN',
  chico: 'Chico',
  ipoker: 'iPoker',
  other: 'Other',
};

export const structureLabels: Record<TournamentStructure, string> = {
  regular: 'Regular',
  turbo: 'Turbo',
  hyper: 'Hyper-Turbo',
  deep: 'Deep Stack',
};

export const tournamentTypeLabels: Record<TournamentType, string> = {
  freezeout: 'Freezeout',
  reentry: 'Re-entry',
  rebuy: 'Rebuy',
  bounty: 'Bounty / PKO',
  mystery_bounty: 'Mystery Bounty',
  satellite: 'Satellite',
  freeroll: 'Freeroll',
};

// --- Color Helpers ---

export function getProfitColor(amount: number): string {
  if (amount > 0) return 'var(--accent-green)';
  if (amount < 0) return 'var(--accent-red)';
  return 'var(--text-muted)';
}

export function getProfitClass(amount: number): string {
  if (amount > 0) return 'profit-positive';
  if (amount < 0) return 'profit-negative';
  return 'profit-neutral';
}

// --- Time Filter Helpers ---

export function getTimeFilterDate(filter: TimeFilter): Date {
  const now = new Date();
  switch (filter) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
      return new Date(0);
  }
}

export function filterSessionsByTime(sessions: Session[], filter: TimeFilter): Session[] {
  const cutoff = getTimeFilterDate(filter);
  return sessions.filter((s) => new Date(s.date) >= cutoff);
}

// --- Streak Calculation ---

export function calculateCurrentStreak(sessions: Session[]): number {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  let streak = 0;
  for (const session of sorted) {
    if (getSessionProfit(session) > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function calculateBestStreak(sessions: Session[]): number {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let best = 0;
  let current = 0;
  for (const session of sorted) {
    if (getSessionProfit(session) > 0) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

// --- Misc ---

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
