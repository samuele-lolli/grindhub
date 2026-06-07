// NOTE: This file is not imported anywhere in the application and exists as
// reference data only. It is consumed by `seed.ts`, which is also unreferenced.

// ============================================================
// GrindHub — Mock Session Generator
// ============================================================

import type { Session, Platform } from '@/types';
import { generateId } from '@/lib/utils';

/** Platforms available for random session generation. */
const PLATFORMS: Platform[] = ['pokerstars', 'ggpoker'];

/** Sample session notes randomly assigned to ~15% of generated sessions. */
const SESSION_NOTES = [
  'Great session, ran well',
  'Bad beat on the bubble',
  'Played solid, good reads',
  'ICM mistake cost me',
  'Deep run but bricked FT',
];

/**
 * Generates a random ISO date string within the last `monthsBack` months.
 * @param monthsBack - How many months into the past to span.
 * @returns An ISO 8601 date string.
 */
function randomDate(monthsBack: number): string {
  const now = new Date();
  const start = new Date(now.getTime() - monthsBack * 30 * 24 * 60 * 60 * 1000);
  const time = start.getTime() + Math.random() * (now.getTime() - start.getTime());
  return new Date(time).toISOString();
}

/**
 * Generates an array of realistic mock MTT sessions for demo/seed purposes.
 *
 * Each session has randomised platforms, event counts, ITM rates, buy-ins,
 * profit multipliers, and durations that approximate real-world poker data
 * (roughly ~15% overall ROI for a winning player).
 *
 * @param count    - Number of sessions to generate. Defaults to `280`.
 * @param playerId - Optional player ID prefix for deterministic session IDs.
 * @returns Sessions sorted newest-first.
 */
export function generateMockSessions(count = 50, playerId?: string): Session[] {
  const sessions: Session[] = [];

  for (let i = 0; i < count; i++) {
    const date = randomDate(6);

    // 1 to 3 platforms per session
    const platformCount = Math.floor(Math.random() * 3) + 1;
    const sessionPlatforms = [...PLATFORMS]
      .sort(() => 0.5 - Math.random())
      .slice(0, platformCount);

    // 5 to 30 events
    const eventCount = Math.floor(Math.random() * 25) + 5;

    // 10% to 25% ITM
    const itmRate = 0.10 + Math.random() * 0.15;
    const cashesCount = Math.round(eventCount * itmRate);

    // Avg buy-in $5 to $50
    const avgBuyIn = 5 + Math.random() * 45;
    const totalBuyIns = eventCount * avgBuyIn;

    // Profit multiplier: realistic pro grinder distribution (~15% overall ROI)
    let profitMultiplier = 0;
    const roll = Math.random();
    if (roll < 0.55) {
      profitMultiplier = Math.random() * 0.5;           // Loss: 0–50% recovered
    } else if (roll < 0.80) {
      profitMultiplier = 0.8 + Math.random() * 0.7;     // Small win / break-even
    } else if (roll < 0.95) {
      profitMultiplier = 1.5 + Math.random() * 2.0;     // Medium win
    } else {
      profitMultiplier = 4.0 + Math.random() * 6.0;     // Big win
    }

    const totalCashes = totalBuyIns * profitMultiplier;

    // Duration: 180 to 600 minutes
    const duration = 180 + Math.floor(Math.random() * 420);

    const session: Session = {
      id: playerId ? `${playerId}-session-${i}` : generateId(),
      date,
      platforms: sessionPlatforms,
      duration,
      eventCount,
      cashesCount,
      totalBuyIns,
      totalCashes,
      notes: Math.random() < 0.15
        ? SESSION_NOTES[Math.floor(Math.random() * SESSION_NOTES.length)]
        : '',
      createdAt: date,
      updatedAt: date,
    };
    sessions.push(session);
  }

  return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
