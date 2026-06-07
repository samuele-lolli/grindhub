'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { DollarSign, TrendingUp, Target, BarChart3, CreditCard, Clock, ChevronRight, Plus, Shield, ArrowUpRight, Users, Wallet } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useProfileStore } from '@/stores/profile-store';
import { useI18n } from '@/i18n';
import {
  formatCurrency, formatPercent, formatDate, formatDuration, formatNumber,
  getSessionProfit, getProfitClass, getBankrollHealth, platformLabels
} from '@/lib/utils';
import styles from './page.module.css';

/**
 * DashboardPage — Primary landing page after login.
 * Renders stat cards, recent sessions, bankroll overview, quick actions, and a monthly summary.
 */
export default function DashboardPage() {
  const { t } = useI18n();
  const sessions = useSessionStore(s => s.sessions);
  const getStats = useSessionStore(s => s.getStats);
  const accounts = useBankrollStore(s => s.accounts);
  const getTotalBankroll = useBankrollStore(s => s.getTotalBankroll);
  const profile = useProfileStore(s => s.profile);

  const stats = useMemo(() => getStats(), [getStats]);
  const totalBankroll = useMemo(() => getTotalBankroll(), [getTotalBankroll]);
  const health = useMemo(() => getBankrollHealth(totalBankroll, stats.avgBuyIn, 'mtt'), [totalBankroll, stats.avgBuyIn]);
  const recentSessions = useMemo(() =>
    [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [sessions]
  );

  // This month stats
  const thisMonthStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSessions = sessions.filter(s => new Date(s.date) >= startOfMonth);
    const monthProfit = monthSessions.reduce((sum, s) => sum + getSessionProfit(s), 0);
    const bestSession = monthSessions.length > 0 ? Math.max(...monthSessions.map(s => getSessionProfit(s))) : 0;
    const worstSession = monthSessions.length > 0 ? Math.min(...monthSessions.map(s => getSessionProfit(s))) : 0;
    const winCount = monthSessions.filter(s => getSessionProfit(s) > 0).length;
    return { count: monthSessions.length, profit: monthProfit, best: bestSession, worst: worstSession, winRate: monthSessions.length > 0 ? (winCount / monthSessions.length) * 100 : 0 };
  }, [sessions]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const displayName = profile?.displayName || 'Player';

  const statCards = [
    { label: t.analytics.totalProfit, value: formatCurrency(stats.totalProfit, 'EUR', true), icon: <DollarSign size={20} />, color: stats.totalProfit >= 0 ? 'green' : 'red' },
    { label: t.analytics.roi, value: formatPercent(stats.roi), icon: <TrendingUp size={20} />, color: 'blue' },
    { label: t.analytics.itm, value: `${stats.itm.toFixed(1)}%`, icon: <Target size={20} />, color: 'purple' },
    { label: t.analytics.volume, value: formatNumber(stats.totalSessions), icon: <BarChart3 size={20} />, color: 'gold' },
    { label: t.analytics.avgBuyIn, value: formatCurrency(stats.avgBuyIn, 'EUR'), icon: <CreditCard size={20} />, color: 'blue' },
    { label: t.analytics.hourlyRate, value: formatCurrency(stats.hourlyRate, 'EUR', true), icon: <Clock size={20} />, color: stats.hourlyRate >= 0 ? 'green' : 'red' },
  ];

  const healthColors: Record<string, string> = { healthy: 'var(--accent-green)', caution: 'var(--accent-gold)', danger: 'var(--accent-red)' };
  const healthLabels: Record<string, string> = { healthy: 'Healthy', caution: 'Caution', danger: 'Under-rolled' };

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className={styles.welcomeBanner}>
        <div>
          <h1 className={styles.welcomeTitle}>{t.dashboard.welcome}, {displayName} 👋</h1>
          <p className={styles.welcomeSub}>{today} — Time to grind!</p>
        </div>
        <Link href="/sessions" className={styles.addSessionBtn}>
          <Plus size={18} /> {t.dashboard.addSession}
        </Link>
      </div>

      {/* Stat Cards Grid */}
      <div className={styles.statsGrid}>
        {statCards.map((card, i) => (
          <div key={i} className={`${styles.statCard} ${styles[`c${card.color}`]}`} style={{ animationDelay: `${i * 50}ms` }}>
            <div className={styles.statIcon}>{card.icon}</div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>{card.label}</span>
              <span className={styles.statValue}>{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className={styles.twoCol}>
        {/* Left: Recent Sessions */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t.dashboard.recentSessions}</h2>
            <Link href="/sessions" className={styles.viewAllLink}>{t.common.viewAll} <ChevronRight size={14} /></Link>
          </div>
          <div className={styles.sessionsList}>
            {recentSessions.length === 0 ? (
              <div className={styles.emptySection}><p>No sessions yet. Start tracking your grind!</p></div>
            ) : recentSessions.map((session, i) => {
              const profit = getSessionProfit(session);
              const name = `MTT Session (${session.eventCount} events)`;
              const plats = session.platforms.map(p => platformLabels[p] || p).join(', ');
              return (
                <div key={session.id} className={styles.sessionRow} style={{ animationDelay: `${i * 40}ms` }}>
                  <div className={styles.sessionLeft}>
                    <span className={styles.sessionDate}>{formatDate(session.date)}</span>
                    <span className={styles.sessionName}>{name}</span>
                    <span className={styles.sessionMeta}>
                      <span className={styles.platformBadge}>{plats}</span>
                      · {formatDuration(session.duration)}
                    </span>
                  </div>
                  <span className={`${styles.sessionProfit} ${getProfitClass(profit)}`}>
                    {formatCurrency(profit, 'EUR', true)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Bankroll + Quick Actions */}
        <div className={styles.rightCol}>
          {/* Bankroll Overview */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t.dashboard.bankrollOverview}</h2>
              <Link href="/bankroll" className={styles.viewAllLink}>Manage <ChevronRight size={14} /></Link>
            </div>
            <div className={styles.bankrollCard}>
              <div className={styles.bankrollTop}>
                <Wallet size={22} className={styles.bankrollIcon} />
                <div>
                  <span className={styles.bankrollLabel}>{t.bankroll.totalBankroll}</span>
                  <span className={styles.bankrollValue}>{formatCurrency(totalBankroll, 'EUR')}</span>
                </div>
                <span className={styles.healthBadge} style={{ color: healthColors[health], borderColor: healthColors[health] }}>
                  <Shield size={12} /> {healthLabels[health]}
                </span>
              </div>
              <div className={styles.accountsList}>
                {accounts.slice(0, 3).map(acc => (
                  <div key={acc.id} className={styles.accountRow}>
                    <span className={styles.accountName}>{acc.name}</span>
                    <span className={styles.accountBalance}>{formatCurrency(acc.balance, acc.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t.dashboard.quickActions}</h2>
            </div>
            <div className={styles.quickActions}>
              <Link href="/analytics" className={styles.actionCard}>
                <BarChart3 size={20} /> <span>{t.dashboard.viewAnalytics}</span> <ArrowUpRight size={14} />
              </Link>
              <Link href="/social" className={styles.actionCard}>
                <Users size={20} /> <span>Social Feed</span> <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* This Month Summary */}
      <div className={styles.monthSummary}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.dashboard.thisMonth}</h2>
        </div>
        <div className={styles.monthGrid}>
          <div className={styles.monthStat}>
            <span className={styles.monthStatLabel}>Sessions</span>
            <span className={styles.monthStatValue}>{thisMonthStats.count}</span>
          </div>
          <div className={styles.monthStat}>
            <span className={styles.monthStatLabel}>Profit</span>
            <span className={`${styles.monthStatValue} ${thisMonthStats.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>{formatCurrency(thisMonthStats.profit, 'EUR', true)}</span>
          </div>
          <div className={styles.monthStat}>
            <span className={styles.monthStatLabel}>Win Rate</span>
            <span className={styles.monthStatValue}>{thisMonthStats.winRate.toFixed(0)}%</span>
          </div>
          <div className={styles.monthStat}>
            <span className={styles.monthStatLabel}>Best Session</span>
            <span className={`${styles.monthStatValue} profit-positive`}>{formatCurrency(thisMonthStats.best, 'EUR', true)}</span>
          </div>
          <div className={styles.monthStat}>
            <span className={styles.monthStatLabel}>Worst Session</span>
            <span className={`${styles.monthStatValue} profit-negative`}>{formatCurrency(thisMonthStats.worst, 'EUR', true)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
