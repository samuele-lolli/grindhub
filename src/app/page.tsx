'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  CreditCard,
  Clock,
  ChevronRight,
  Plus,
  Shield,
  ArrowUpRight,
  Users,
  Wallet,
  ArrowRightLeft,
  Flame,
} from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useProfileStore } from '@/stores/profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useGoalsStore } from '@/stores/goals-store';
import { SyncBalancesModal } from '@/components/ui/SyncBalancesModal';
import { useI18n } from '@/i18n';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  formatDuration,
  formatNumber,
  getSessionProfit,
  getProfitClass,
  getBankrollHealth,
  platformLabels,
  sortSessionsDesc,
  isoToDateInput,
} from '@/lib/utils';
import styles from './page.module.css';

/**
 * DashboardPage — Primary Grinder Control Room after login.
 */
export default function DashboardPage() {
  const { t, locale } = useI18n();
  const sessions = useSessionStore((s) => s.sessions);
  const getStats = useSessionStore((s) => s.getStats);
  const accounts = useBankrollStore((s) => s.accounts);
  const profile = useProfileStore((s) => s.profile);
  const settings = useSettingsStore((s) => s.settings);
  const goals = useGoalsStore((s) => s.goals);

  const [showSyncModal, setShowSyncModal] = useState(false);

  const currency = settings?.currency || 'EUR';
  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active').slice(0, 2), [goals]);

  const stats = useMemo(() => getStats(sessions), [getStats, sessions]);
  const totalBankroll = useMemo(
    () => accounts.filter((a) => a.category === 'poker_room').reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );
  const totalNetWorth = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );
  const abiBuyIns = useMemo(
    () => (stats.avgBuyIn > 0 ? Math.floor(totalBankroll / stats.avgBuyIn) : 0),
    [totalBankroll, stats.avgBuyIn]
  );
  const recommendedSafeAbi = useMemo(
    () => (totalBankroll > 0 ? totalBankroll / 100 : 0),
    [totalBankroll]
  );
  const health = useMemo(
    () => getBankrollHealth(totalBankroll, stats.avgBuyIn, 'mtt'),
    [totalBankroll, stats.avgBuyIn]
  );
  const recentSessions = useMemo(() => sortSessionsDesc(sessions).slice(0, 8), [sessions]);

  // Timezone-safe current month summary
  const thisMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthSessions = sessions.filter((s) =>
      isoToDateInput(s.date).startsWith(currentMonthPrefix)
    );
    const monthProfit = monthSessions.reduce((sum, s) => sum + getSessionProfit(s), 0);
    const monthBuyIns = monthSessions.reduce((sum, s) => sum + s.totalBuyIns, 0);
    const monthRoi = monthBuyIns > 0 ? (monthProfit / monthBuyIns) * 100 : 0;
    const monthMtts = monthSessions.reduce((sum, s) => sum + (s.eventCount || 1), 0);
    const monthHours = monthSessions.reduce((sum, s) => sum + s.duration / 60, 0);
    const bestSession =
      monthSessions.length > 0 ? Math.max(...monthSessions.map((s) => getSessionProfit(s))) : 0;
    const worstSession =
      monthSessions.length > 0 ? Math.min(...monthSessions.map((s) => getSessionProfit(s))) : 0;
    const winCount = monthSessions.filter((s) => getSessionProfit(s) > 0).length;
    return {
      count: monthSessions.length,
      mtts: monthMtts,
      hours: monthHours,
      profit: monthProfit,
      roi: monthRoi,
      best: bestSession,
      worst: worstSession,
      winRate: monthSessions.length > 0 ? (winCount / monthSessions.length) * 100 : 0,
    };
  }, [sessions]);

  const today = new Date().toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const displayName = profile?.displayName || 'Player';
  const totalBuyInsInvested = useMemo(
    () => sessions.reduce((sum, s) => sum + s.totalBuyIns, 0),
    [sessions]
  );
  const totalCashesCount = useMemo(
    () => sessions.reduce((sum, s) => sum + s.cashesCount, 0),
    [sessions]
  );

  const statCards = [
    {
      label: t.analytics.totalProfit,
      value: formatCurrency(stats.totalProfit, currency, true),
      sub: `${stats.winRate.toFixed(0)}% ${t.dashboard.winningSessions}`,
      icon: <DollarSign size={20} />,
      color: stats.totalProfit >= 0 ? 'green' : 'red',
    },
    {
      label: t.analytics.roi,
      value: formatPercent(stats.roi),
      sub: `${t.dashboard.invested}: ${formatCurrency(totalBuyInsInvested, currency)}`,
      icon: <TrendingUp size={20} />,
      color: 'blue',
    },
    {
      label: t.analytics.itm,
      value: `${stats.itm.toFixed(1)}%`,
      sub: `${formatNumber(totalCashesCount)} / ${formatNumber(stats.totalTournaments)} MTT`,
      icon: <Target size={20} />,
      color: 'purple',
    },
    {
      label: t.dashboard.mttVolume,
      value: `${formatNumber(stats.totalTournaments)} MTT`,
      sub: `${formatNumber(stats.totalSessions)} ${t.dashboard.sessionsLogged}`,
      icon: <BarChart3 size={20} />,
      color: 'gold',
    },
    {
      label: t.analytics.avgBuyIn,
      value: formatCurrency(stats.avgBuyIn, currency),
      sub: abiBuyIns > 0 ? `${abiBuyIns}x ${t.dashboard.inRoll}` : t.dashboard.safeTarget,
      icon: <CreditCard size={20} />,
      color: 'blue',
    },
    {
      label: t.analytics.hourlyRate,
      value: formatCurrency(stats.hourlyRate, currency, true),
      sub: `${stats.totalHoursPlayed.toFixed(1)}h ${t.dashboard.totalGrind}`,
      icon: <Clock size={20} />,
      color: stats.hourlyRate >= 0 ? 'green' : 'red',
    },
  ];

  const healthColors: Record<string, string> = {
    healthy: 'var(--accent-green)',
    caution: 'var(--accent-gold)',
    danger: 'var(--accent-red)',
  };
  const healthLabels: Record<string, string> = {
    healthy: t.dashboard.healthHealthy,
    caution: t.dashboard.healthCaution,
    danger: t.dashboard.healthDanger,
  };

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className={styles.welcomeBanner}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className={styles.welcomeTitle}>
              {t.dashboard.welcome}, {displayName}
            </h1>
            {stats.currentStreak !== 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  background:
                    stats.currentStreak > 0 ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                  color: stats.currentStreak > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  border: `1px solid ${
                    stats.currentStreak > 0 ? 'rgba(0,229,153,0.3)' : 'rgba(255,59,92,0.3)'
                  }`,
                }}
              >
                <Flame size={13} />
                {stats.currentStreak > 0
                  ? `+${stats.currentStreak} ${t.dashboard.hotStreak}`
                  : `${stats.currentStreak} ${t.dashboard.downswing}`}
              </span>
            )}
          </div>
          <p className={styles.welcomeSub} style={{ textTransform: 'capitalize' }}>
            {today} — {t.dashboard.controlRoom}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className={styles.syncRollBtn}
          >
            <ArrowRightLeft size={16} /> {t.dashboard.quickSync}
          </button>
          <Link href="/sessions" className={styles.addSessionBtn}>
            <Plus size={18} /> {t.dashboard.addSession}
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className={styles.statsGrid}>
        {statCards.map((card, i) => (
          <div
            key={i}
            className={`${styles.statCard} ${styles[`c${card.color}`]}`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={styles.statIcon}>{card.icon}</div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>{card.label}</span>
              <span className={styles.statValue}>{card.value}</span>
              {card.sub && <span className={styles.statSub}>{card.sub}</span>}
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
            <Link href="/sessions" className={styles.viewAllLink}>
              {t.common.viewAll} <ChevronRight size={14} />
            </Link>
          </div>
          <div className={styles.sessionsList}>
            {recentSessions.length === 0 ? (
              <div className={styles.emptySection}>
                <p>{t.dashboard.noSessionsYet}</p>
              </div>
            ) : (
              recentSessions.map((session, i) => {
                const profit = getSessionProfit(session);
                const name = `${t.dashboard.mttSessionLabel} (${session.eventCount} MTT · ${session.cashesCount} ITM)`;
                const plats = session.platforms.map((p) => platformLabels[p] || p).join(', ');
                return (
                  <div
                    key={session.id}
                    className={styles.sessionRow}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className={styles.sessionLeft}>
                      <span className={styles.sessionDate}>{formatDate(session.date, locale)}</span>
                      <span className={styles.sessionName}>{name}</span>
                      <span className={styles.sessionMeta}>
                        <span className={styles.platformBadge}>{plats}</span>·{' '}
                        {formatDuration(session.duration)}
                      </span>
                    </div>
                    <span className={`${styles.sessionProfit} ${getProfitClass(profit)}`}>
                      {formatCurrency(profit, currency, true)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Bankroll + Goals + Quick Actions */}
        <div className={styles.rightCol}>
          {/* Bankroll Overview */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t.dashboard.bankrollOverview}</h2>
              <Link href="/bankroll" className={styles.viewAllLink}>
                {t.dashboard.manage} <ChevronRight size={14} />
              </Link>
            </div>
            <div className={styles.bankrollCard}>
              <div className={styles.bankrollTop}>
                <Wallet size={22} className={styles.bankrollIcon} />
                <div>
                  <span className={styles.bankrollLabel}>{t.dashboard.playableBankroll}</span>
                  <span className={styles.bankrollValue}>
                    {formatCurrency(totalBankroll, currency)}
                  </span>
                </div>
                <span
                  className={styles.healthBadge}
                  style={{ color: healthColors[health], borderColor: healthColors[health] }}
                >
                  <Shield size={12} /> {healthLabels[health]}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  padding: '10px 12px',
                  marginBottom: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 210, 255, 0.04)',
                  border: '1px solid var(--border-secondary)',
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.dashboard.netWorth}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {formatCurrency(totalNetWorth, currency)}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.dashboard.rollDepth}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--accent-blue)',
                    }}
                  >
                    {abiBuyIns > 0 ? `${abiBuyIns}x ABI` : '—'}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.dashboard.safeAbi100}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--accent-green)',
                    }}
                  >
                    {formatCurrency(recommendedSafeAbi, currency)}
                  </span>
                </div>
              </div>
              <div className={styles.accountsList}>
                {accounts.slice(0, 4).map((acc) => (
                  <div key={acc.id} className={styles.accountRow}>
                    <span className={styles.accountName}>{acc.name}</span>
                    <span className={styles.accountBalance}>
                      {formatCurrency(acc.balance, acc.currency || currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Goals */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t.dashboard.activeGoalsTitle}</h2>
              <Link href="/goals" className={styles.viewAllLink}>
                {t.dashboard.manage} <ChevronRight size={14} />
              </Link>
            </div>
            <div className={styles.quickActions} style={{ flexDirection: 'column', gap: '12px' }}>
              {activeGoals.length === 0 ? (
                <div
                  className={styles.actionCard}
                  style={{ cursor: 'default', justifyContent: 'center' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{t.dashboard.noActiveGoals}</span>
                </div>
              ) : (
                activeGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className={styles.actionCard}
                    style={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: '8px',
                      cursor: 'default',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 'var(--font-semibold)' }}>{goal.title}</span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {goal.type === 'profit' || goal.type === 'bankroll'
                          ? `${formatCurrency(goal.currentValue, currency)} / ${formatCurrency(
                              goal.targetValue,
                              currency
                            )}`
                          : `${goal.currentValue} / ${goal.targetValue}${
                              goal.type === 'roi' ? '%' : ''
                            }`}
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: 'var(--gradient-primary)',
                          width: `${Math.min(
                            100,
                            Math.max(0, (goal.currentValue / goal.targetValue) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t.dashboard.quickActions}</h2>
            </div>
            <div className={styles.quickActions}>
              <Link href="/analytics" className={styles.actionCard}>
                <BarChart3 size={20} /> <span>{t.dashboard.viewAnalytics}</span>{' '}
                <ArrowUpRight size={14} />
              </Link>
              <Link href="/social" className={styles.actionCard}>
                <Users size={20} /> <span>{t.dashboard.communityLeaderboardAction}</span>{' '}
                <ArrowUpRight size={14} />
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
            <span className={styles.monthStatLabel}>{t.dashboard.mttVolume}</span>
            <span className={styles.monthStatValue}>
              {thisMonthStats.mtts} MTT{' '}
              <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ({thisMonthStats.count}s)
              </small>
            </span>
          </div>
          <div className={styles.monthStat}>
            <span className={styles.monthStatLabel}>{t.sessions.profit}</span>
            <span
              className={`${styles.monthStatValue} ${
                thisMonthStats.profit >= 0 ? 'profit-positive' : 'profit-negative'
              }`}
            >
              {formatCurrency(thisMonthStats.profit, currency, true)}
            </span>
          </div>
          <div className={styles.monthStat}>
            <span className={styles.monthStatLabel}>{t.dashboard.roiWinRate}</span>
            <span className={styles.monthStatValue}>
              {formatPercent(thisMonthStats.roi)} · {thisMonthStats.winRate.toFixed(0)}%
            </span>
          </div>
          <div className={styles.monthStat}>
            <span className={styles.monthStatLabel}>{t.dashboard.bestSession}</span>
            <span className={`${styles.monthStatValue} profit-positive`}>
              {formatCurrency(thisMonthStats.best, currency, true)}
            </span>
          </div>
          <div className={styles.monthStat}>
            <span className={styles.monthStatLabel}>{t.dashboard.worstSession}</span>
            <span className={`${styles.monthStatValue} profit-negative`}>
              {formatCurrency(thisMonthStats.worst, currency, true)}
            </span>
          </div>
        </div>
      </div>

      <SyncBalancesModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
    </div>
  );
}
