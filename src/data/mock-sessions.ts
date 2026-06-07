import type { Session, Platform } from '@/types';
import { generateId } from '@/lib/utils';

const PLATFORMS: Platform[] = ['pokerstars', 'ggpoker', 'winamax', '888poker'];

function randomDate(monthsBack: number): string {
  const now = new Date();
  const start = new Date(now.getTime() - monthsBack * 30 * 24 * 60 * 60 * 1000);
  const time = start.getTime() + Math.random() * (now.getTime() - start.getTime());
  return new Date(time).toISOString();
}

export function generateMockSessions(count = 280, playerId?: string): Session[] {
  const sessions: Session[] = [];

  for (let i = 0; i < count; i++) {
    const date = randomDate(6);
    
    // 1 to 3 platforms per session
    const platformCount = Math.floor(Math.random() * 3) + 1;
    const sessionPlatforms = [...PLATFORMS].sort(() => 0.5 - Math.random()).slice(0, platformCount);
    
    // 5 to 30 events
    const eventCount = Math.floor(Math.random() * 25) + 5;
    
    // 10% to 25% ITM
    const itmRate = 0.10 + Math.random() * 0.15;
    const cashesCount = Math.round(eventCount * itmRate);
    
    // Avg buy-in 5 to 50
    const avgBuyIn = 5 + Math.random() * 45;
    const totalBuyIns = eventCount * avgBuyIn;
    
    // Profit multiplier: realistic pro grinder stats (~15% overall ROI)
    let profitMult = 0;
    const r = Math.random();
    if (r < 0.55) {
      profitMult = Math.random() * 0.5; // Loss: 0% to 50% recovered
    } else if (r < 0.80) {
      profitMult = 0.8 + Math.random() * 0.7; // Small win / breakeven
    } else if (r < 0.95) {
      profitMult = 1.5 + Math.random() * 2.0; // Medium win
    } else {
      profitMult = 4.0 + Math.random() * 6.0; // Big win
    }
    
    const totalCashes = totalBuyIns * profitMult;
    
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
      notes: Math.random() < 0.15 ? ['Great session, ran well', 'Bad beat on the bubble', 'Played solid, good reads', 'ICM mistake cost me', 'Deep run but bricked FT'][Math.floor(Math.random() * 5)] : '',
      createdAt: date,
      updatedAt: date,
    };
    sessions.push(session);
  }

  return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
