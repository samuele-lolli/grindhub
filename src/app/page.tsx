'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Target, Shield, Flame, TrendingUp, Award, BarChart3, MessageCircle,
  ArrowRight, Plus, Hexagon,
} from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useProfileStore } from '@/stores/profile-store';
import { useGoalsStore } from '@/stores/goals-store';
import { useSocialStore } from '@/stores/social-store';
import { useI18n } from '@/i18n';
import {
  formatCurrency, formatPercent, formatNumber, formatDate, formatRelativeTime,
  getSessionProfit, getProfitClass, getSessionBuyIn, getBankrollHealth, clamp,
} from '@/lib/utils';
import type { PostType } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import styles from './page.module.css';

/** Tiny inline sparkline rendered from a series of cumulative values. */
function Sparkline({ values, color = 'var(--accent-green)' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className={styles.sparkline} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Maps a social post category to a meaningful icon. */
function activityIcon(type: PostType) {
  switch (type) {
    case 'session_result': return <TrendingUp size={16} />;
    case 'milestone': return <Award size={16} />;
    case 'goal_completed': return <Target size={16} />;
    case 'stats_share': return <BarChart3 size={16} />;
    default: return <MessageCircle size={16} />;
  }
}

/**
 * DashboardPage — Primary landing page after login.
 * GRINDOS dashboard: goal & KPI hero cards, performance overview, recent
 * sessions, activity feed, community highlights and a call-to-action.
 * All widgets are wired to existing stores — no data is fabricated.
 */
export default function DashboardPage() {
  const { t } = useI18n();
  const sessions = useSessionStore(s => s.sessions);
  const getStats = useSessionStore(s => s.getStats);
  const getTotalBankroll = useBankrollStore(s => s.getTotalBankroll);
  const profile = useProfileStore(s => s.profile);
  const players = useProfileStore(s => s.players);
  const goals = useGoalsStore(s => s.goals);
  const feed = useSocialStore(s => s.feed);

  const stats = useMemo(() => getStats(), [getStats]);
  const totalBankroll = useMemo(() => getTotalBankroll(), [getTotalBankroll]);
  const health = useMemo(() => getBankrollHealth(totalBankroll, stats.avgBuyIn, 'mtt'), [totalBankroll, stats.avgBuyIn]);

  const recentSessions = useMemo(() =>
    [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [sessions]
  );

  // Monthly profit + previous-month delta + cumulative sparkline
  const month = useMemo(() => {
    const now = new Date();
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisSessions = sessions
      .filter(s => new Date(s.date) >= startThis)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastProfit = sessions
      .filter(s => { const d = new Date(s.date); return d >= startLast && d < startThis; })
      .reduce((sum, s) => sum + getSessionProfit(s), 0);
    const profit = thisSessions.reduce((sum, s) => sum + getSessionProfit(s), 0);
    const spark = thisSessions.map((_, i) =>
      thisSessions.slice(0, i + 1).reduce((sum, s) => sum + getSessionProfit(s), 0)
    );
    const delta = lastProfit !== 0 ? ((profit - lastProfit) / Math.abs(lastProfit)) * 100 : null;
    return { profit, delta, spark };
  }, [sessions]);

  const activeGoal = useMemo(() => goals.find(g => g.status === 'active') ?? null, [goals]);
  const goalPct = activeGoal ? clamp((activeGoal.currentValue / activeGoal.targetValue) * 100, 0, 100) : 0;
  const goalDaysLeft = useMemo(() => {
    if (!activeGoal?.deadline) return null;
    const diff = new Date(activeGoal.deadline).getTime() - new Date().getTime();
    return diff > 0 ? Math.ceil(diff / 86400000) : 0;
  }, [activeGoal]);

  const authorMap = useMemo(() => {
    const m = new Map<string, { name: string; avatar?: string }>();
    if (profile) m.set(profile.id, { name: profile.displayName, avatar: profile.avatar });
    players.forEach(p => m.set(p.id, { name: p.displayName, avatar: p.avatar }));
    return m;
  }, [players, profile]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);
  const displayName = profile?.displayName?.split(' ')[0] || 'Player';

  const streakDots = Array.from({ length: 10 }, (_, i) => i < Math.min(stats.currentStreak, 10));

  const perfStats = [
    { label: 'Tournaments', value: formatNumber(stats.totalTournaments) },
    { label: 'Profit', value: formatCurrency(stats.totalProfit, 'EUR', true), cls: getProfitClass(stats.totalProfit) },
    { label: 'ROI', value: formatPercent(stats.roi), cls: getProfitClass(stats.roi) },
    { label: 'ITM %', value: `${stats.itm.toFixed(1)}%` },
    { label: 'Avg Buy-in', value: formatCurrency(stats.avgBuyIn, 'EUR') },
    { label: 'Hours Played', value: `${Math.round(stats.totalHoursPlayed)}h` },
  ];

  const healthLabels: Record<string, string> = { healthy: 'Healthy', caution: 'Caution', danger: 'Under-rolled' };
  const healthColors: Record<string, string> = { healthy: 'var(--accent-green)', caution: 'var(--accent-gold)', danger: 'var(--accent-red)' };

  return (
    <div className="page-container">
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>{greeting}, {displayName} 👋</h1>
          <p className={styles.greetingSub}>Stay focused. Every session counts.</p>
        </div>
        <Link href="/sessions" className={styles.addBtn}>
          <Plus size={18} /> {t.dashboard.addSession}
        </Link>
      </div>

      {/* Row 1 — Hero cards */}
      <div className={styles.heroGrid}>
        {/* Volume / active goal */}
        <div className={`${styles.card} ${styles.goalCard}`}>
          <div className={styles.goalInfo}>
            <span className={styles.cardLabel}>Active Goal</span>
            {activeGoal ? (
              <>
                <h3 className={styles.goalTitle}>{activeGoal.title}</h3>
                <p className={styles.goalDesc}>{activeGoal.description}</p>
                <div className={styles.goalPct}>{goalPct.toFixed(0)}%</div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${goalPct}%` }} />
                </div>
                <div className={styles.goalFooter}>
                  <span>{goalDaysLeft !== null ? `${goalDaysLeft} days left` : 'No deadline'}</span>
                  <span>{formatNumber(activeGoal.currentValue)} / {formatNumber(activeGoal.targetValue)}</span>
                </div>
              </>
            ) : (
              <>
                <h3 className={styles.goalTitle}>No active goal</h3>
                <p className={styles.goalDesc}>Set a target and start building your career.</p>
                <Link href="/goals" className={styles.goalCta}>Set a goal <ArrowRight size={14} /></Link>
              </>
            )}
          </div>
          <Target className={styles.goalGraphic} size={150} strokeWidth={1} />
        </div>

        {/* Monthly profit */}
        <div className={`${styles.card} ${styles.kpiCard}`}>
          <span className={styles.cardLabel}>Monthly Profit</span>
          <div className={`${styles.kpiValue} ${getProfitClass(month.profit)}`}>
            {formatCurrency(month.profit, 'EUR', true)}
          </div>
          <div className={styles.kpiSub}>
            {month.delta !== null
              ? <>vs last month <span className={getProfitClass(month.delta)}>{formatPercent(month.delta)}</span></>
              : 'this month'}
          </div>
          <Sparkline values={month.spark} color={month.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        </div>

        {/* Bankroll health */}
        <div className={`${styles.card} ${styles.kpiCard}`}>
          <span className={styles.cardLabel}>Bankroll Health</span>
          <div className={styles.kpiValue} style={{ color: healthColors[health] }}>{healthLabels[health]}</div>
          <div className={styles.kpiSub}>Playable: {formatCurrency(totalBankroll, 'EUR')}</div>
          <Shield className={styles.kpiGraphic} size={120} strokeWidth={1} style={{ color: healthColors[health] }} />
        </div>

        {/* Current streak */}
        <div className={`${styles.card} ${styles.kpiCard}`}>
          <span className={styles.cardLabel}>Current Streak</span>
          <div className={styles.kpiValue}>{stats.currentStreak}</div>
          <div className={styles.kpiSub}>sessions in the green</div>
          <div className={styles.streakDots}>
            {streakDots.map((on, i) => (
              <span key={i} className={`${styles.dot} ${on ? styles.dotOn : ''}`} />
            ))}
          </div>
          <Flame className={styles.kpiGraphic} size={120} strokeWidth={1} style={{ color: 'var(--accent-gold)' }} />
        </div>
      </div>

      {/* Row 2 — main + rail */}
      <div className={styles.mainGrid}>
        <div className={styles.mainCol}>
          {/* Performance overview */}
          <div className={`${styles.card} ${styles.perfCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>Performance Overview</span>
              <span className={styles.pill}>All-time</span>
            </div>
            <div className={styles.perfGrid}>
              {perfStats.map((s, i) => (
                <div key={i} className={styles.perfStat}>
                  <span className={styles.perfLabel}>{s.label}</span>
                  <span className={`${styles.perfValue} ${s.cls ?? ''}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent sessions + activity */}
          <div className={styles.subGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardLabel}>Recent Sessions</span>
                <Link href="/sessions" className={styles.viewAll}>{t.common.viewAll}</Link>
              </div>
              {recentSessions.length === 0 ? (
                <div className={styles.empty}>No sessions yet. Start tracking your grind!</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr><th>Date</th><th>Tournament</th><th className={styles.num}>Buy-in</th><th className={styles.num}>Result</th><th className={styles.num}>ROI</th></tr>
                  </thead>
                  <tbody>
                    {recentSessions.map(s => {
                      const profit = getSessionProfit(s);
                      const roi = s.totalBuyIns > 0 ? (profit / s.totalBuyIns) * 100 : 0;
                      return (
                        <tr key={s.id}>
                          <td>{formatDate(s.date)}</td>
                          <td>MTT · {s.eventCount} events</td>
                          <td className={styles.num}>{formatCurrency(getSessionBuyIn(s), 'EUR')}</td>
                          <td className={`${styles.num} ${getProfitClass(profit)}`}>{formatCurrency(profit, 'EUR', true)}</td>
                          <td className={`${styles.num} ${getProfitClass(roi)}`}>{formatPercent(roi)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <Link href="/sessions" className={styles.cardFooterLink}>View all sessions <ArrowRight size={14} /></Link>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardLabel}>Activity Feed</span>
                <Link href="/social" className={styles.viewAll}>{t.common.viewAll}</Link>
              </div>
              {feed.length === 0 ? (
                <div className={styles.empty}>No recent activity yet.</div>
              ) : (
                <div className={styles.activityList}>
                  {feed.slice(0, 4).map(post => {
                    const author = authorMap.get(post.authorId);
                    return (
                      <div key={post.id} className={styles.activityRow}>
                        <Avatar name={author?.name || 'Player'} src={author?.avatar} size="sm" />
                        <div className={styles.activityBody}>
                          <span className={styles.activityText}>
                            <strong>{author?.name || 'Player'}</strong> {post.content}
                          </span>
                          <span className={styles.activityTime}>{formatRelativeTime(post.createdAt)}</span>
                        </div>
                        <span className={styles.activityIcon}>{activityIcon(post.type)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className={styles.railCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>Community Highlights</span>
              <Link href="/social" className={styles.viewAll}>{t.common.viewAll}</Link>
            </div>
            {players.length === 0 ? (
              <div className={styles.empty}>No players to show yet.</div>
            ) : (
              <div className={styles.leaderboard}>
                {players.slice(0, 5).map((p, i) => (
                  <div key={p.id} className={styles.leaderRow}>
                    <span className={styles.rank}>{i + 1}</span>
                    <Avatar name={p.displayName} src={p.avatar} size="sm" />
                    <span className={styles.leaderName}>{p.displayName}</span>
                    <span className={styles.leaderHandle}>@{p.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${styles.card} ${styles.quoteCard}`}>
            <span className={styles.quoteMark}>“</span>
            <p className={styles.quoteText}>Discipline today. Freedom tomorrow.</p>
            <span className={styles.quoteAuthor}>— The GRINDOS Mindset</span>
            <Hexagon className={styles.quoteGraphic} size={130} strokeWidth={1} />
          </div>
        </div>
      </div>

      {/* CTA banner */}
      <div className={styles.ctaBanner}>
        <div className={styles.ctaIcon}><Hexagon size={26} /></div>
        <div className={styles.ctaText}>
          <h3>Ready to take your game to the next level?</h3>
          <p>Analyze deeper, learn faster and crush your goals.</p>
        </div>
        <Link href="/analytics" className={styles.ctaBtn}>
          {t.dashboard.viewAnalytics} <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
