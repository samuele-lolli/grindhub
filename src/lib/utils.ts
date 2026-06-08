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

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/**
 * Generates a globally unique identifier string (UUID v4).
 * Uses `crypto.randomUUID()` when available, falling back to a
 * Math.random()-based polyfill for older browsers.
 * @returns A UUID v4 string, e.g. `"550e8400-e29b-41d4-a716-446655440000"`.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Currency Formatting
// ---------------------------------------------------------------------------

/** Maps each supported currency to its display symbol. */
const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Formats a numeric amount as a human-readable currency string.
 *
 * Amounts ≥ 1 000 are formatted with thousand separators and no decimals.
 * Amounts < 1 000 are formatted to two decimal places.
 *
 * @param amount   - The monetary value (may be negative).
 * @param currency - The ISO currency code. Defaults to `'EUR'`.
 * @param showSign - When `true`, positive values are prefixed with `+`.
 * @returns A formatted string such as `"+€1,250"` or `"-$42.50"`.
 */
export function formatCurrency(
  amount: number,
  currency: Currency = 'EUR',
  showSign = false,
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

/**
 * Formats a monetary amount in compact notation (K / M suffixes).
 * @param amount   - The monetary value (may be negative).
 * @param currency - The ISO currency code. Defaults to `'EUR'`.
 * @returns A compact string such as `"€12.5K"` or `"-$1.3M"`.
 */
export function formatCompactCurrency(amount: number, currency: Currency = 'EUR'): string {
  const symbol = currencySymbols[currency];
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${symbol}${abs.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Number Formatting
// ---------------------------------------------------------------------------

/**
 * Generate a consistent avatar color from a string ID
 */
export function getAvatarColor(id: string): string {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Formats a number as a percentage string with a leading sign.
 * @param value    - The percentage value.
 * @param decimals - Decimal places to display. Defaults to `1`.
 * @returns A string such as `"+12.3%"` or `"-4.0%"`.
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Formats a number with locale-aware thousand separators.
 * @param value    - The numeric value.
 * @param decimals - Fixed decimal places. Defaults to `0`.
 * @returns A locale-formatted string, e.g. `"1,234"`.
 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ---------------------------------------------------------------------------
// Date Formatting
// ---------------------------------------------------------------------------

/**
 * Formats an ISO date string as a short date (e.g. "Jun 7, 2026").
 * @param dateStr - An ISO 8601 date string.
 * @param locale  - Display locale (`'en'` or `'it'`). Defaults to `'en'`.
 * @returns The formatted date, or `"Invalid date"` on parse failure.
 */
export function formatDate(dateStr: string, locale: 'en' | 'it' = 'en'): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return 'Invalid date';
  return format(date, 'MMM d, yyyy', { locale: locale === 'it' ? it : enUS });
}

/**
 * Formats an ISO date string as date + time (e.g. "Jun 7, 2026 14:30").
 * @param dateStr - An ISO 8601 date string.
 * @param locale  - Display locale (`'en'` or `'it'`). Defaults to `'en'`.
 * @returns The formatted date-time, or `"Invalid date"` on parse failure.
 */
export function formatDateTime(dateStr: string, locale: 'en' | 'it' = 'en'): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return 'Invalid date';
  return format(date, 'MMM d, yyyy HH:mm', { locale: locale === 'it' ? it : enUS });
}

/**
 * Returns a human-readable relative time string (e.g. "3 hours ago").
 * @param dateStr - An ISO 8601 date string.
 * @param locale  - Display locale (`'en'` or `'it'`). Defaults to `'en'`.
 * @returns The relative time string, or `"Invalid date"` on parse failure.
 */
export function formatRelativeTime(dateStr: string, locale: 'en' | 'it' = 'en'): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return 'Invalid date';
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: locale === 'it' ? it : enUS,
  });
}

/**
 * Formats a duration given in minutes as a compact `"Xh Ym"` string.
 * @param minutes - Total duration in minutes.
 * @returns A string such as `"3h 15m"`, `"45m"`, or `"2h"`.
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ---------------------------------------------------------------------------
// Poker Math
// ---------------------------------------------------------------------------

/**
 * Calculates Return on Investment as a percentage.
 * @param totalProfit - Net profit (may be negative).
 * @param totalBuyIns - Sum of all buy-ins invested.
 * @returns ROI percentage, or `0` when `totalBuyIns` is zero.
 */
export function calculateROI(totalProfit: number, totalBuyIns: number): number {
  if (totalBuyIns === 0) return 0;
  return (totalProfit / totalBuyIns) * 100;
}

/**
 * Calculates In-The-Money percentage.
 * @param cashCount        - Number of tournaments that cashed.
 * @param totalTournaments - Total number of tournaments played.
 * @returns ITM percentage, or `0` when `totalTournaments` is zero.
 */
export function calculateITM(cashCount: number, totalTournaments: number): number {
  if (totalTournaments === 0) return 0;
  return (cashCount / totalTournaments) * 100;
}

/**
 * Calculates the hourly profit rate.
 * @param totalProfit  - Net profit (may be negative).
 * @param totalMinutes - Total time played in minutes.
 * @returns Profit per hour, or `0` when `totalMinutes` is zero.
 */
export function calculateHourlyRate(totalProfit: number, totalMinutes: number): number {
  if (totalMinutes === 0) return 0;
  return totalProfit / (totalMinutes / 60);
}

/**
 * Calculates the win-rate as a percentage of profitable sessions.
 * @param winCount      - Number of sessions with positive profit.
 * @param totalSessions - Total number of sessions.
 * @returns Win-rate percentage, or `0` when `totalSessions` is zero.
 */
export function calculateWinRate(winCount: number, totalSessions: number): number {
  if (totalSessions === 0) return 0;
  return (winCount / totalSessions) * 100;
}

// ---------------------------------------------------------------------------
// Session Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the net profit for a single session.
 * @param session - The session to evaluate.
 * @returns `totalCashes − totalBuyIns`.
 */
export function getSessionProfit(session: Session): number {
  return session.totalCashes - session.totalBuyIns;
}

/**
 * Computes the average buy-in per event within a session.
 * Falls back to `totalBuyIns` when the event count is unavailable.
 * @param session - The session to evaluate.
 * @returns Average buy-in per event.
 */
export function getSessionBuyIn(session: Session): number {
  if (session.eventCount && session.eventCount > 0) {
    return session.totalBuyIns / session.eventCount;
  }
  return session.totalBuyIns;
}

/**
 * Checks whether a session ended in profit.
 * @param session - The session to evaluate.
 * @returns `true` if net profit is strictly positive.
 */
export function isSessionProfitable(session: Session): boolean {
  return getSessionProfit(session) > 0;
}

// ---------------------------------------------------------------------------
// Bankroll Health
// ---------------------------------------------------------------------------

/**
 * Evaluates bankroll health based on how many average buy-ins the
 * player can afford, compared to game-type-specific recommendations.
 *
 * | Game Type | Recommended buy-ins |
 * |-----------|---------------------|
 * | MTT       | 100                 |
 * | Cash      | 30                  |
 * | SNG       | 50                  |
 * | Spin      | 50                  |
 *
 * @param bankroll - Current bankroll amount.
 * @param avgBuyIn - Average buy-in for the game type.
 * @param gameType - The type of game being played.
 * @returns `'healthy'` (≥ 100%), `'caution'` (≥ 50%), or `'danger'` (< 50%).
 */
export function getBankrollHealth(
  bankroll: number,
  avgBuyIn: number,
  gameType: GameType,
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

/**
 * Returns the recommended number of buy-ins for a given game type.
 * @param gameType - The type of game.
 * @returns Recommended buy-in count.
 */
export function getRecommendedBuyIns(gameType: GameType): number {
  const map: Record<GameType, number> = { mtt: 100, cash: 30, sng: 50, spin: 50 };
  return map[gameType];
}

// ---------------------------------------------------------------------------
// Label Maps
// ---------------------------------------------------------------------------

/** Human-readable labels for each game type. */
export const gameTypeLabels: Record<GameType, string> = {
  mtt: 'MTT',
  cash: 'Cash Game',
  sng: 'Sit & Go',
  spin: 'Spin & Go',
};

/** Human-readable labels for each platform. */
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

/** Human-readable labels for each tournament structure. */
export const structureLabels: Record<TournamentStructure, string> = {
  regular: 'Regular',
  turbo: 'Turbo',
  hyper: 'Hyper-Turbo',
  deep: 'Deep Stack',
};

/** Human-readable labels for each tournament type. */
export const tournamentTypeLabels: Record<TournamentType, string> = {
  freezeout: 'Freezeout',
  reentry: 'Re-entry',
  rebuy: 'Rebuy',
  bounty: 'Bounty / PKO',
  mystery_bounty: 'Mystery Bounty',
  satellite: 'Satellite',
  freeroll: 'Freeroll',
};

// ---------------------------------------------------------------------------
// Color / CSS Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a CSS custom-property color based on profit sign.
 * @param amount - The profit amount.
 * @returns A CSS `var(--…)` expression for green, red, or muted.
 */
export function getProfitColor(amount: number): string {
  if (amount > 0) return 'var(--accent-green)';
  if (amount < 0) return 'var(--accent-red)';
  return 'var(--text-muted)';
}

/**
 * Returns a CSS class name based on profit sign.
 * @param amount - The profit amount.
 * @returns `'profit-positive'`, `'profit-negative'`, or `'profit-neutral'`.
 */
export function getProfitClass(amount: number): string {
  if (amount > 0) return 'profit-positive';
  if (amount < 0) return 'profit-negative';
  return 'profit-neutral';
}

// ---------------------------------------------------------------------------
// Time Filter Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a `TimeFilter` preset into a cutoff `Date`.
 * @param filter - The time-range filter to apply.
 * @returns A `Date` representing the start of the time window.
 */
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

/**
 * Filters an array of sessions to only those on or after the cutoff date.
 * @param sessions - The full list of sessions.
 * @param filter   - The time-range preset.
 * @returns Sessions whose date is ≥ the cutoff.
 */
export function filterSessionsByTime(sessions: Session[], filter: TimeFilter): Session[] {
  const cutoff = getTimeFilterDate(filter);
  return sessions.filter((s) => new Date(s.date) >= cutoff);
}

// ---------------------------------------------------------------------------
// Streak Calculations
// ---------------------------------------------------------------------------

/**
 * Calculates the current winning streak — the number of consecutive
 * profitable sessions starting from the most recent.
 * @param sessions - All sessions (order does not matter; sorted internally).
 * @returns Length of the current winning streak.
 */
export function calculateCurrentStreak(sessions: Session[]): number {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
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

/**
 * Finds the longest winning streak across all sessions.
 * Sessions are evaluated in chronological (oldest-first) order.
 * @param sessions - All sessions (order does not matter; sorted internally).
 * @returns Length of the best (longest) winning streak.
 */
export function calculateBestStreak(sessions: Session[]): number {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
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

// ---------------------------------------------------------------------------
// General Utilities
// ---------------------------------------------------------------------------

/**
 * Clamps a numeric value between a minimum and maximum bound.
 * @param value - The value to clamp.
 * @param min   - Lower bound (inclusive).
 * @param max   - Upper bound (inclusive).
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Extracts up to two uppercase initials from a display name.
 * @param name - A person's display name (e.g. "Marco Rinaldi").
 * @returns Up to two uppercase initials, e.g. `"MR"`.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Truncates a string to `maxLength` characters, appending `"…"` if needed.
 * @param str       - The input string.
 * @param maxLength - Maximum allowed length (including ellipsis).
 * @returns The original or truncated string.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Joins CSS class names, filtering out falsy values.
 * Lightweight alternative to libraries like `clsx`.
 * @param classes - Class name strings or falsy values.
 * @returns A single space-separated class string.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
