// NOTE: This file is not imported anywhere in the application and exists as
// reference data only.

// ============================================================
// GrindHub — Local-Storage Seed Script
// ============================================================

import type { PlayerProfile, SocialPost, BankrollAccount, BankrollTransaction, Goal } from '@/types';
import { generateId } from '@/lib/utils';
import { MOCK_PLAYERS as mockPlayers } from './mock-players';
import { generateMockSessions } from './mock-sessions';

/**
 * Returns `true` when running in a browser environment.
 * @returns Whether `window` is defined.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Checks whether localStorage has already been seeded.
 * Always returns `true` on the server to prevent SSR side-effects.
 * @returns `true` if seed data already exists.
 */
function isSeeded(): boolean {
  if (!isBrowser()) return true;
  return localStorage.getItem('grindhub-seeded') === 'true';
}

/**
 * Seeds localStorage with demo data for the entire application.
 *
 * Creates a current-user profile, 280 mock sessions, bankroll accounts and
 * transactions, social posts from mock players, goals, and default settings.
 * This function is idempotent — it no-ops if localStorage has already been
 * seeded or if called on the server.
 */
export function seedData(): void {
  if (!isBrowser() || isSeeded()) return;

  // 1. Create current user profile
  const currentUser: PlayerProfile = {
    id: 'current-user',
    username: 'grinder_pro',
    displayName: 'You',
    avatar: '',
    bio: 'MTT grinder focused on micro-to-mid stakes. Always learning, always grinding.',
    country: 'IT',
    yearsPlaying: 4,
    primaryGameType: 'mtt',
    preferredStakes: '$11-$55',
    platforms: ['pokerstars', 'ggpoker'],
    joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    privacy: {
      showProfit: true,
      showROI: true,
      showITM: true,
      showVolume: true,
      showAvgBuyIn: true,
      showHourlyRate: false,
      showBiggestWin: true,
      showCurrentStreak: true,
      autoShareGoals: true,
    },
    isCurrentUser: true,
  };

  // 2. Generate sessions for current user
  const sessions = generateMockSessions(280);

  // 3. Create bankroll accounts
  const accounts: BankrollAccount[] = [
    {
      id: 'acc-ps',
      platform: 'pokerstars',
      name: 'PokerStars Main',
      balance: 2450,
      currency: 'EUR',
      category: 'poker_room',
      createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'acc-gg',
      platform: 'ggpoker',
      name: 'GGPoker',
      balance: 1820,
      currency: 'EUR',
      category: 'poker_room',
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'acc-wina',
      platform: 'winamax',
      name: 'Winamax',
      balance: 680,
      currency: 'EUR',
      category: 'poker_room',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // 4. Create bankroll transactions
  const transactions: BankrollTransaction[] = [];
  const txDates = Array.from({ length: 25 }, (_, i) =>
    new Date(Date.now() - (150 - i * 6) * 24 * 60 * 60 * 1000).toISOString(),
  );

  let balance = 0;
  for (const date of txDates) {
    const isDeposit = Math.random() < 0.4 || balance < 200;
    const amount = isDeposit
      ? Math.floor(Math.random() * 400 + 100)
      : -Math.floor(Math.random() * Math.min(200, balance * 0.3) + 50);
    balance += amount;

    transactions.push({
      id: generateId(),
      accountId: ['acc-ps', 'acc-gg', 'acc-wina'][Math.floor(Math.random() * 3)],
      type: amount > 0 ? 'deposit' : 'withdrawal',
      amount,
      date,
      notes: amount > 0 ? 'Deposit' : 'Withdrawal',
      createdAt: date,
    });
  }

  // 5. Create social posts from mock players
  const posts: SocialPost[] = [];
  const now = Date.now();

  const tournamentNames = ['Sunday Million', 'Bounty Builder', 'GGMasters', 'Daily Grind'];
  const textPosts = [
    'Studying ICM spots all day, this game never stops evolving 📚',
    'Just moved up to $55 MTTs, wish me luck! 🚀',
    'Back to back final tables, feeling great about my game 🔥',
    'Taking a break today, mental game is just as important 🧘',
  ];
  const commentTexts = ['Nice! 🔥', 'GG!', 'Keep grinding! 💪', 'Impressive run!', 'Well played'];

  mockPlayers.slice(0, 10).forEach((player, i) => {
    const postTypes: Array<{ type: SocialPost['type']; content: string }> = [
      {
        type: 'session_result',
        content: `🏆 Just shipped a $${Math.floor(Math.random() * 5000 + 500)} score in the ${tournamentNames[Math.floor(Math.random() * tournamentNames.length)]}!`,
      },
      {
        type: 'milestone',
        content: `📈 Reached $${Math.floor(Math.random() * 10000 + 1000)} total profit! The grind pays off 💪`,
      },
      {
        type: 'text',
        content: textPosts[Math.floor(Math.random() * textPosts.length)],
      },
      {
        type: 'goal_completed',
        content: '🎯 Goal completed: Played 100 tournaments this month! Consistency is key.',
      },
    ];

    const post = postTypes[Math.floor(Math.random() * postTypes.length)];
    posts.push({
      id: `post-${i}`,
      authorId: player.id,
      type: post.type,
      content: post.content,
      kudos: mockPlayers.slice(0, Math.floor(Math.random() * 6)).map((p) => p.id),
      comments:
        Math.random() < 0.4
          ? [
              {
                id: generateId(),
                authorId: mockPlayers[Math.floor(Math.random() * mockPlayers.length)].id,
                content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
                createdAt: new Date(now - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
              },
            ]
          : [],
      createdAt: new Date(
        now - i * 8 * 60 * 60 * 1000 - Math.random() * 4 * 60 * 60 * 1000,
      ).toISOString(),
      isPublic: true,
    });
  });

  // 6. Create goals
  const goals: Goal[] = [
    {
      id: 'goal-1',
      title: 'Play 100 MTTs this month',
      description: 'Stay consistent with volume',
      type: 'volume',
      targetValue: 100,
      currentValue: 67,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'goal-2',
      title: 'Achieve 15% ROI this quarter',
      description: 'Focus on game selection and A-game',
      type: 'roi',
      targetValue: 15,
      currentValue: 11.2,
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'goal-3',
      title: 'Build bankroll to €5,000',
      description: 'Proper BRM to move up in stakes',
      type: 'profit',
      targetValue: 5000,
      currentValue: 4950,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // 7. Persist everything to localStorage
  const following = mockPlayers.slice(0, 6).map((p) => p.id);

  localStorage.setItem('grindhub-sessions', JSON.stringify({ state: { sessions }, version: 0 }));
  localStorage.setItem(
    'grindhub-bankroll',
    JSON.stringify({ state: { accounts, transactions }, version: 0 }),
  );
  localStorage.setItem(
    'grindhub-profile',
    JSON.stringify({ state: { profile: currentUser, players: mockPlayers }, version: 0 }),
  );
  localStorage.setItem(
    'grindhub-social',
    JSON.stringify({ state: { posts, following }, version: 0 }),
  );
  localStorage.setItem(
    'grindhub-goals',
    JSON.stringify({ state: { goals, achievements: [] }, version: 0 }),
  );
  localStorage.setItem(
    'grindhub-settings',
    JSON.stringify({
      state: {
        settings: {
          currency: 'EUR',
          locale: 'en',
          theme: 'dark',
          defaultGameType: 'mtt',
          defaultPlatform: 'pokerstars',
          autoShareSessions: false,
        },
      },
      version: 0,
    }),
  );
  localStorage.setItem('grindhub-seeded', 'true');
}
