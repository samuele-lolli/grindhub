// ============================================================
// GrindHub — Core Type Definitions
// ============================================================

// --- Game & Platform Enums ---

export type GameType = 'mtt' | 'cash' | 'sng' | 'spin';

export type GameTypeLabel = {
  [K in GameType]: string;
};

export type TournamentStructure = 'regular' | 'turbo' | 'hyper' | 'deep';

export type TournamentType =
  | 'freezeout'
  | 'reentry'
  | 'rebuy'
  | 'bounty'
  | 'mystery_bounty'
  | 'satellite'
  | 'freeroll';

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

export type Currency = 'USD' | 'EUR' | 'GBP';

// --- Session Types ---

export interface AggregatedMTTSession {
  id: string;
  date: string; // ISO string
  platforms: Platform[];
  duration: number; // minutes
  eventCount: number; // number of MTTs played
  cashesCount: number; // number of MTTs cashed
  totalBuyIns: number; // total amount spent
  totalCashes: number; // total amount won
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type Session = AggregatedMTTSession;

// --- Bankroll Types ---

export type BankrollCategory = 'poker_room' | 'e_wallet' | 'crypto' | 'bank_account' | 'cash';

export interface BankrollAccount {
  id: string;
  platform: Platform;
  name: string;
  balance: number;
  currency: Currency;
  category: BankrollCategory;
  createdAt: string;
  updatedAt: string;
}

export interface BankrollTransaction {
  id: string;
  accountId: string;
  type: 'deposit' | 'withdrawal' | 'session_result' | 'transfer';
  amount: number;
  date: string;
  notes: string;
  sessionId?: string;
  createdAt: string;
}

export type BankrollHealthStatus = 'healthy' | 'caution' | 'danger';

// --- Player / Profile Types ---

export interface PlayerPrivacySettings {
  showProfit: boolean;
  showROI: boolean;
  showITM: boolean;
  showVolume: boolean;
  showAvgBuyIn: boolean;
  showHourlyRate: boolean;
  showBiggestWin: boolean;
  showCurrentStreak: boolean;
}

export interface PlayerProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  country: string;
  yearsPlaying: number;
  primaryGameType: GameType;
  preferredStakes: string;
  platforms: Platform[];
  joinedAt: string;
  privacy: PlayerPrivacySettings;
  isCurrentUser?: boolean;
}

export interface PlayerStats {
  totalProfit: number;
  totalSessions: number;
  totalTournaments: number;
  roi: number;
  itm: number;
  avgBuyIn: number;
  hourlyRate: number;
  biggestWin: number;
  currentStreak: number;
  bestStreak: number;
  totalHoursPlayed: number;
  winRate: number;
  avgFinishPercentile: number;
  finalTablePercent: number;
}

// --- Social Types ---

export type PostType = 'session_result' | 'milestone' | 'goal_completed' | 'text' | 'stats_share';

export interface SocialPost {
  id: string;
  authorId: string;
  type: PostType;
  content: string;
  data?: Record<string, unknown>;
  sessionData?: Partial<AggregatedMTTSession>; // Rich embed data for shared sessions
  kudos: string[]; // array of user IDs who gave kudos
  comments: PostComment[];
  createdAt: string;
  isPublic: boolean;
}

export interface PostComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

// --- Goals & Achievements ---

export type GoalType = 'volume' | 'profit' | 'roi' | 'time' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'failed' | 'paused';

export interface Goal {
  id: string;
  title: string;
  description: string;
  type: GoalType;
  targetValue: number;
  currentValue: number;
  deadline: string;
  status: GoalStatus;
  createdAt: string;
  completedAt?: string;
}

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

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

// --- App Settings ---

export interface AppSettings {
  currency: Currency;
  locale: 'en' | 'it';
  theme: 'dark'; // Only dark for now
  defaultGameType: GameType;
  defaultPlatform: Platform;
  autoShareSessions: boolean;
}

// --- Utility Types ---

export interface DateRange {
  start: string;
  end: string;
}

export type TimeFilter = '7d' | '30d' | '90d' | '1y' | 'all';

export interface ChartDataPoint {
  label: string;
  value: number;
}
