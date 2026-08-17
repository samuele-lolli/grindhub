// ============================================================
// GrindHub — Core Type Definitions
// ============================================================

// ---------------------------------------------------------------------------
// Game & Platform Enums
// ---------------------------------------------------------------------------

/** Supported poker game formats. */
export type GameType = 'mtt' | 'cash' | 'sng' | 'spin';

/** Maps each `GameType` to a human-readable label string. */
export type GameTypeLabel = {
  [K in GameType]: string;
};

/** Tournament blind-structure speed categories. */
export type TournamentStructure = 'regular' | 'turbo' | 'hyper' | 'deep';

/** Tournament format / re-entry rules. */
export type TournamentType =
  | 'freezeout'
  | 'reentry'
  | 'rebuy'
  | 'bounty'
  | 'mystery_bounty'
  | 'satellite'
  | 'freeroll';

/** Online poker platforms tracked by the application. */
export type Platform =
  | 'pokerstars'
  | 'ggpoker'
  | '888poker'
  | 'winamax'
  | 'partypoker'
  | 'natural8'
  | 'wpn'
  | 'chico'
  | 'ipoker'
  | 'other';

/** ISO 4217 currency codes supported for bankroll tracking. */
export type Currency = 'USD' | 'EUR' | 'GBP';

// ---------------------------------------------------------------------------
// Session Types
// ---------------------------------------------------------------------------

/**
 * An aggregated multi-table tournament (MTT) session.
 * Groups one or more MTTs played in a single sitting.
 */
export interface AggregatedMTTSession {
  /** Unique session identifier. */
  id: string;
  /** Date of the session (ISO 8601 string). */
  date: string;
  /** Platforms the player used during this session. */
  platforms: Platform[];
  /** Total session duration in minutes. */
  duration: number;
  /** Number of MTTs played in this session. */
  eventCount: number;
  /** Number of MTTs that paid out (cashed). */
  cashesCount: number;
  /** Total amount spent on buy-ins across all events. */
  totalBuyIns: number;
  /** Total amount won (cashes) across all events. */
  totalCashes: number;
  /** Optional player notes about the session. */
  notes: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-update timestamp. */
  updatedAt: string;
}

/**
 * Alias for the primary session type used throughout the app.
 * Currently only MTT sessions are supported.
 */
export type Session = AggregatedMTTSession;

// ---------------------------------------------------------------------------
// Bankroll Types
// ---------------------------------------------------------------------------

/** Categories for bankroll account storage locations. */
export type BankrollCategory = 'poker_room' | 'e_wallet' | 'crypto' | 'bank_account' | 'cash';

/** A single bankroll account (e.g. a PokerStars balance). */
export interface BankrollAccount {
  /** Unique account identifier. */
  id: string;
  /** Platform this account belongs to. */
  platform: Platform;
  /** User-assigned display name for the account. */
  name: string;
  /** Current account balance. */
  balance: number;
  /** Currency of this account. */
  currency: Currency;
  /** Storage category. */
  category: BankrollCategory;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-update timestamp. */
  updatedAt: string;
}

/** A deposit, withdrawal, or transfer affecting a bankroll account. */
export interface BankrollTransaction {
  /** Unique transaction identifier. */
  id: string;
  /** The bankroll account this transaction belongs to. */
  accountId: string;
  /** Transaction type. */
  type: 'deposit' | 'withdrawal' | 'session_result' | 'transfer';
  /** Transaction amount (negative for withdrawals). */
  amount: number;
  /** ISO 8601 date of the transaction. */
  date: string;
  /** Optional notes or memo. */
  notes: string;
  /** Session that triggered this transaction, if applicable. */
  sessionId?: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/** Traffic-light indicator for bankroll adequacy. */
export type BankrollHealthStatus = 'healthy' | 'caution' | 'danger';

// ---------------------------------------------------------------------------
// Player / Profile Types
// ---------------------------------------------------------------------------

/** Controls which stats are visible on a player's public profile. */
export interface PlayerPrivacySettings {
  showProfit: boolean;
  showROI: boolean;
  showITM: boolean;
  showVolume: boolean;
  showAvgBuyIn: boolean;
  showHourlyRate: boolean;
  showBiggestWin: boolean;
  showCurrentStreak: boolean;
  autoShareGoals: boolean;
}

/** A player's public-facing profile information. */
export interface PlayerProfile {
  /** Unique player identifier. */
  id: string;
  /** Unique username handle. */
  username: string;
  /** Display name shown in the UI. */
  displayName: string;
  /** Avatar color hex or image URL. */
  avatar: string;
  /** Short biography / tagline. */
  bio: string;
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
  /** Number of years playing poker. */
  yearsPlaying: number;
  /** The game type the player primarily plays. */
  primaryGameType: GameType;
  /** Free-text description of preferred stake levels. */
  preferredStakes: string;
  /** Platforms the player is active on. */
  platforms: Platform[];
  /** ISO 8601 date when the player joined GrindHub. */
  joinedAt: string;
  /** Privacy toggles for profile stats. */
  privacy: PlayerPrivacySettings;
  /** `true` when this profile represents the authenticated user. */
  isCurrentUser?: boolean;
}

/** Aggregated statistics for a player. */
export interface PlayerStats {
  /** Net profit across all sessions. */
  totalProfit: number;
  /** Total number of sessions logged. */
  totalSessions: number;
  /** Total number of individual tournaments played. */
  totalTournaments: number;
  /** Return on Investment percentage. */
  roi: number;
  /** In-The-Money percentage. */
  itm: number;
  /** Average buy-in per tournament. */
  avgBuyIn: number;
  /** Hourly profit rate. */
  hourlyRate: number;
  /** Largest single-session profit. */
  biggestWin: number;
  /** Length of the current winning streak. */
  currentStreak: number;
  /** Length of the best (longest) winning streak. */
  bestStreak: number;
  /** Total hours played across all sessions. */
  totalHoursPlayed: number;
  /** Percentage of sessions that were profitable. */
  winRate: number;
}

// ---------------------------------------------------------------------------
// Social Types
// ---------------------------------------------------------------------------

/** Types of posts that can appear in the social feed. */
export type PostType = 'session_result' | 'milestone' | 'goal_completed' | 'text' | 'stats_share';

/** A post in the social feed. */
export interface SocialPost {
  /** Unique post identifier. */
  id: string;
  /** Player ID of the post author. */
  authorId: string;
  /** Category of the post. */
  type: PostType;
  /** Main text content of the post. */
  content: string;
  /** Arbitrary structured data attached to the post. */
  data?: Record<string, unknown>;
  /** Optional embedded session snapshot for session-result posts. */
  sessionData?: Partial<AggregatedMTTSession>;
  /** Array of user IDs who gave kudos. */
  kudos: string[];
  /** Threaded comments on the post. */
  comments: PostComment[];
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** Whether the post is visible to all users. */
  isPublic: boolean;
}

/** A single comment on a social post. */
export interface PostComment {
  /** Unique comment identifier. */
  id: string;
  /** Player ID of the comment author. */
  authorId: string;
  /** Text content of the comment. */
  content: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Goals & Achievements
// ---------------------------------------------------------------------------

/** Goal metric categories. */
export type GoalType = 'volume' | 'profit' | 'roi' | 'time' | 'custom';

/** Lifecycle status of a goal. */
export type GoalStatus = 'active' | 'completed' | 'failed' | 'paused';

/** A player-defined goal with progress tracking. */
export interface Goal {
  /** Unique goal identifier. */
  id: string;
  /** Short title of the goal. */
  title: string;
  /** Longer description or rationale. */
  description: string;
  /** The metric this goal tracks. */
  type: GoalType;
  /** Target value to achieve. */
  targetValue: number;
  /** Current progress toward the target. */
  currentValue: number;
  /** ISO 8601 deadline date. */
  deadline: string;
  /** Current lifecycle status. */
  status: GoalStatus;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp when the goal was completed, if applicable. */
  completedAt?: string;
}

/** All possible achievement identifiers. */
export type AchievementId =
  | 'first_cash'
  | 'win_streak_5'
  | 'win_streak_10'
  | 'big_score_1k'
  | 'big_score_5k'
  | 'big_score_10k'
  | 'roi_month_20'
  | 'volume_100'
  | 'volume_500'
  | 'volume_1000'
  | 'grind_streak_7'
  | 'grind_streak_30'
  | 'final_table_king'
  | 'leaderboard_top';

/** An unlockable achievement badge. */
export interface Achievement {
  /** Machine identifier for this achievement. */
  id: AchievementId;
  /** Display title. */
  title: string;
  /** Description shown in the achievement panel. */
  description: string;
  /** Emoji or icon identifier. */
  icon: string;
  /** ISO 8601 timestamp when unlocked, or `undefined` if locked. */
  unlockedAt?: string;
}

// ---------------------------------------------------------------------------
// App Settings
// ---------------------------------------------------------------------------

/** Global application settings persisted per user. */
export interface AppSettings {
  /** Preferred display currency. */
  currency: Currency;
  /** UI locale. */
  locale: 'en' | 'it';
  /** Color theme — currently only dark mode is supported. */
  theme: 'dark';
  /** Default game type for new sessions. */
  defaultGameType: GameType;
  /** Default platform for new sessions. */
  defaultPlatform: Platform;
  /** Whether new sessions are auto-shared to the social feed. */
  autoShareSessions: boolean;
}

// ---------------------------------------------------------------------------
// Utility Types
// ---------------------------------------------------------------------------

/** An inclusive date range defined by ISO 8601 strings. */
export interface DateRange {
  /** Start date (inclusive). */
  start: string;
  /** End date (inclusive). */
  end: string;
}

/** Preset time-range filters for dashboard views. */
export type TimeFilter = '7d' | '30d' | '90d' | '1y' | 'all';

/** A single labelled data point for chart rendering. */
export interface ChartDataPoint {
  /** Display label (e.g. month name or category). */
  label: string;
  /** Numeric value to chart. */
  value: number;
}
