'use client';

import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import dynamic from 'next/dynamic';

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });
import { TrendingUp, Target, BarChart3, DollarSign, CreditCard, Clock, Award, Zap } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useI18n } from '@/i18n';
import {
  formatCurrency, formatPercent, formatNumber, getSessionProfit, getSessionBuyIn,
  filterSessionsByTime, platformLabels, isSessionProfitable
} from '@/lib/utils';
import type { TimeFilter, Session } from '@/types';
import styles from './page.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const timeFilters: { id: TimeFilter; label: string }[] = [
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
];

export default function AnalyticsPage() {
  const { t } = useI18n();
  const sessions = useSessionStore(s => s.sessions);
  const getStats = useSessionStore(s => s.getStats);
  const accounts = useBankrollStore(s => s.accounts);
  const transactions = useBankrollStore(s => s.transactions);
  const [filter, setFilter] = useState<TimeFilter>('all');

  const filtered = useMemo(() => filterSessionsByTime(sessions, filter), [sessions, filter]);
  const stats = useMemo(() => getStats(filtered), [getStats, filtered]);

  // --- Stat cards data ---
  const statCards = useMemo(() => [
    { label: t.analytics.totalProfit, value: formatCurrency(stats.totalProfit, 'EUR', true), icon: <DollarSign size={18} />, color: stats.totalProfit >= 0 ? 'green' : 'red' },
    { label: t.analytics.roi, value: formatPercent(stats.roi), icon: <TrendingUp size={18} />, color: 'blue' },
    { label: t.analytics.itm, value: `${stats.itm.toFixed(1)}%`, icon: <Target size={18} />, color: 'purple' },
    { label: t.analytics.volume, value: formatNumber(stats.totalSessions), icon: <BarChart3 size={18} />, color: 'gold' },
    { label: t.analytics.avgBuyIn, value: formatCurrency(stats.avgBuyIn, 'EUR'), icon: <CreditCard size={18} />, color: 'blue' },
    { label: t.analytics.hourlyRate, value: formatCurrency(stats.hourlyRate, 'EUR', true), icon: <Clock size={18} />, color: stats.hourlyRate >= 0 ? 'green' : 'red' },
    { label: t.analytics.winRate, value: `${stats.winRate.toFixed(1)}%`, icon: <Award size={18} />, color: 'green' },
    { label: t.analytics.biggestWin, value: formatCurrency(stats.biggestWin, 'EUR'), icon: <Zap size={18} />, color: 'gold' },
  ], [stats, t]);

  // --- Bankroll over time ---
  const profitChart = useMemo(() => {
    // 1. Get total bankroll
    const totalBankroll = accounts
      .filter(a => a.category !== 'bank_account' && a.category !== 'cash')
      .reduce((sum, a) => sum + a.balance, 0);

    const playableAccountIds = new Set(accounts.filter(a => a.category !== 'bank_account' && a.category !== 'cash').map(a => a.id));
    const events: { date: Date; amount: number }[] = [];
    
    // We must use ALL sessions and transactions to trace backwards correctly!
    sessions.forEach(s => events.push({ date: new Date(s.date), amount: getSessionProfit(s) }));
    transactions.forEach(tx => {
      if (playableAccountIds.has(tx.accountId)) {
        events.push({ date: new Date(tx.date), amount: tx.type === 'deposit' ? tx.amount : -tx.amount });
      }
    });

    const sortedEvents = events.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const byDay = new Map<string, number>();
    
    if (sortedEvents.length > 0) {
      const dayChanges = new Map<string, number>();
      sortedEvents.forEach(e => {
        const key = e.date.toISOString().split('T')[0];
        dayChanges.set(key, (dayChanges.get(key) || 0) + e.amount);
      });

      const startDateStr = sortedEvents[0].date.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      
      const allDays: string[] = [];
      const currentD = new Date(startDateStr + 'T12:00:00Z');
      while (true) {
        const dStr = currentD.toISOString().split('T')[0];
        allDays.push(dStr);
        if (dStr === todayStr) break;
        currentD.setUTCDate(currentD.getUTCDate() + 1);
        if (allDays.length > 3650) break;
      }
      
      let runningBankroll = totalBankroll;
      
      for (let i = allDays.length - 1; i >= 0; i--) {
        const key = allDays[i];
        byDay.set(key, runningBankroll);
        
        if (dayChanges.has(key)) {
          runningBankroll -= dayChanges.get(key)!;
        }
      }
    } else {
       byDay.set(new Date().toISOString().split('T')[0], totalBankroll);
    }

    // Now filter the chart for the current view!
    let chronologicalDays = Array.from(byDay.keys()).sort();
    
    const now = new Date().getTime();
    if (filter === '30d') {
      const cutoff = new Date(now - 30 * 86400000).toISOString().split('T')[0];
      chronologicalDays = chronologicalDays.filter(d => d >= cutoff);
    } else if (filter === '90d') {
      const cutoff = new Date(now - 90 * 86400000).toISOString().split('T')[0];
      chronologicalDays = chronologicalDays.filter(d => d >= cutoff);
    } else if (filter === '1y') {
      const cutoff = new Date(now - 365 * 86400000).toISOString().split('T')[0];
      chronologicalDays = chronologicalDays.filter(d => d >= cutoff);
    }

    return {
      labels: chronologicalDays.map(d => { const parts = d.split('-'); return `${parts[1]}/${parts[2]}`; }),
      datasets: [{
        data: chronologicalDays.map(d => byDay.get(d)!),
        fill: true, borderColor: '#10b981',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(16,185,129,0.1)';
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(16,185,129,0.25)');
          gradient.addColorStop(1, 'rgba(16,185,129,0)');
          return gradient;
        },
        cubicInterpolationMode: 'monotone' as const, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2,
        pointHoverBackgroundColor: '#10b981', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
      }],
    };
  }, [sessions, transactions, filter, accounts]);

  // --- ROI by buy-in level ---
  const roiByLevel = useMemo(() => {
    const buckets: Record<string, { profit: number; cost: number; count: number }> = {
      '$1-5': { profit: 0, cost: 0, count: 0 },
      '$5-11': { profit: 0, cost: 0, count: 0 },
      '$11-22': { profit: 0, cost: 0, count: 0 },
      '$22-55': { profit: 0, cost: 0, count: 0 },
      '$55-109': { profit: 0, cost: 0, count: 0 },
      '$109+': { profit: 0, cost: 0, count: 0 },
    };
    filtered.forEach(s => {
      const avgBuyIn = getSessionBuyIn(s);
      let bucket = '$109+';
      if (avgBuyIn < 5) bucket = '$1-5';
      else if (avgBuyIn < 11) bucket = '$5-11';
      else if (avgBuyIn < 22) bucket = '$11-22';
      else if (avgBuyIn < 55) bucket = '$22-55';
      else if (avgBuyIn < 109) bucket = '$55-109';
      
      buckets[bucket].profit += getSessionProfit(s);
      buckets[bucket].cost += s.totalBuyIns;
      buckets[bucket].count++;
    });
    const labels = Object.keys(buckets);
    const rois = labels.map(l => buckets[l].cost > 0 ? (buckets[l].profit / buckets[l].cost) * 100 : 0);
    const counts = labels.map(l => buckets[l].count);
    return {
      labels,
      datasets: [
        {
          label: 'ROI %', data: rois,
          backgroundColor: rois.map(r => r >= 0 ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)'),
          borderColor: rois.map(r => r >= 0 ? '#10b981' : '#ef4444'),
          borderWidth: 1, borderRadius: 4,
        },
      ],
      counts,
    };
  }, [filtered]);

  // --- Platform breakdown ---
  const platformChart = useMemo(() => {
    const byPlatform: Record<string, number> = {};
    filtered.forEach(s => {
      s.platforms.forEach(p => {
        byPlatform[p] = (byPlatform[p] || 0) + 1;
      });
    });
    const labels = Object.keys(byPlatform).map(k => platformLabels[k as keyof typeof platformLabels] || k);
    return {
      labels,
      datasets: [{
        data: Object.values(byPlatform),
        backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'],
        borderWidth: 0, hoverOffset: 8,
      }],
    };
  }, [filtered]);

  // --- Results distribution histogram ---
  const resultsDistribution = useMemo(() => {
    const buckets: Record<string, number> = {
      'Loss $200+': 0, 'Loss $50-200': 0, 'Loss $10-50': 0, 'Loss $0-10': 0,
      'Win $0-10': 0, 'Win $10-50': 0, 'Win $50-200': 0, 'Win $200-1K': 0, 'Win $1K+': 0,
    };
    filtered.forEach(s => {
      const p = getSessionProfit(s);
      if (p <= -200) buckets['Loss $200+']++;
      else if (p <= -50) buckets['Loss $50-200']++;
      else if (p <= -10) buckets['Loss $10-50']++;
      else if (p < 0) buckets['Loss $0-10']++;
      else if (p < 10) buckets['Win $0-10']++;
      else if (p < 50) buckets['Win $10-50']++;
      else if (p < 200) buckets['Win $50-200']++;
      else if (p < 1000) buckets['Win $200-1K']++;
      else buckets['Win $1K+']++;
    });
    return {
      labels: Object.keys(buckets),
      datasets: [{
        label: 'Sessions', data: Object.values(buckets),
        backgroundColor: [
          'rgba(239,68,68,0.7)', 'rgba(239,68,68,0.5)', 'rgba(239,68,68,0.3)', 'rgba(239,68,68,0.15)',
          'rgba(16,185,129,0.15)', 'rgba(16,185,129,0.3)', 'rgba(16,185,129,0.5)', 'rgba(16,185,129,0.7)', 'rgba(16,185,129,0.9)',
        ],
        borderWidth: 0, borderRadius: 3,
      }],
    };
  }, [filtered]);

  // --- Monthly performance table ---
  const monthlyPerformance = useMemo(() => {
    const byMonth = new Map<string, { sessions: number; profit: number; wins: number }>();
    filtered.forEach(s => {
      const key = s.date.substring(0, 7);
      const entry = byMonth.get(key) || { sessions: 0, profit: 0, wins: 0 };
      entry.sessions++;
      entry.profit += getSessionProfit(s);
      if (isSessionProfitable(s)) entry.wins++;
      byMonth.set(key, entry);
    });
    return Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8)
      .map(([month, data]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        ...data,
        winRate: data.sessions > 0 ? (data.wins / data.sessions) * 100 : 0,
      }));
  }, [filtered]);

  // Chart options
  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 12, displayColors: false, callbacks: { label: (ctx:any) => formatCurrency(ctx.raw, 'EUR') } } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', maxTicksLimit: 12, maxRotation: 45 } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', callback: (v:any) => `€${v}` } } }
  };
  const barOptions = { 
    ...lineOptions, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: { ...lineOptions.plugins, tooltip: { ...lineOptions.plugins.tooltip, callbacks: { label: (ctx:any) => `${Number(ctx.raw).toFixed(1)}%` } } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scales: { ...lineOptions.scales, y: { ...lineOptions.scales.y, ticks: { ...lineOptions.scales.y.ticks, callback: (v: any) => `${v}%` } } } 
  };
  const histOptions = { 
    ...lineOptions, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: { ...lineOptions.plugins, tooltip: { ...lineOptions.plugins.tooltip, callbacks: { label: (ctx:any) => `${ctx.raw} Sessions` } } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scales: { ...lineOptions.scales, x: { ...lineOptions.scales.x, ticks: { ...lineOptions.scales.x.ticks, maxRotation: 45 } }, y: { ...lineOptions.scales.y, ticks: { ...lineOptions.scales.y.ticks, callback: (v: any) => v } } } 
  };

  if (filtered.length === 0) {
    return (
      <div className="page-container">
        <div className="page-header"><h1 className="page-title">{t.analytics.title}</h1></div>
        <div style={{ textAlign: 'center', padding: 'var(--space-20)', color: 'var(--text-muted)' }}>
          <BarChart3 size={64} style={{ margin: '0 auto var(--space-4)' }} />
          <h2 style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>{t.analytics.noData}</h2>
          <p>{t.analytics.playMore}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{t.analytics.title}</h1>
        <div className={styles.timeFilters}>
          {timeFilters.map(tf => (
            <button key={tf.id} className={`${styles.filterBtn} ${filter === tf.id ? styles.activeFilter : ''}`}
              onClick={() => setFilter(tf.id)}>{tf.label}</button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {statCards.map((card, i) => (
          <div key={i} className={`${styles.miniStat} ${styles[`c${card.color}`]}`} style={{ animationDelay: `${i * 40}ms` }}>
            <div className={styles.miniIcon}>{card.icon}</div>
            <span className={styles.miniLabel}>{card.label}</span>
            <span className={styles.miniValue}>{card.value}</span>
          </div>
        ))}
      </div>

        {/* Chart: Profit Over Time */}
        <div className={`${styles.chartCard} ${styles.fullWidth}`} style={{ animationDelay: '100ms' }}>
          <h2 className={styles.chartTitle}>Bankroll Over Time</h2>
          <div className={styles.chartWrapper}>
            <Line data={profitChart} options={lineOptions} />
          </div>
      </div>

      {/* Charts Row 2: ROI by Level + Game Type */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>{t.analytics.roiByLevel}</h3>
          <div className={styles.chartWrap}>
            <Bar data={{ labels: roiByLevel.labels, datasets: roiByLevel.datasets }} options={barOptions} />
          </div>
          <div className={styles.bucketCounts}>
            {roiByLevel.labels.map((l, i) => (
              <span key={l} className={styles.bucketCount}>{l}: {roiByLevel.counts[i]} games</span>
            ))}
          </div>
        </div>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Platform Breakdown</h3>
          <div className={styles.chartWrapSmall}>
            <Doughnut data={platformChart} options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { display: true, position: 'bottom' as const, labels: { color: '#94a3b8', padding: 14, usePointStyle: true, font: { size: 12 } } } } }} />
          </div>
        </div>
      </div>

      {/* Charts Row 3: Results Distribution (full width) */}
      <div className={styles.chartCardFull}>
        <h3 className={styles.chartTitle}>{t.analytics.resultsDistribution}</h3>
        <div className={styles.chartWrap}>
          <Bar data={resultsDistribution} options={histOptions} />
        </div>
      </div>

      {/* Monthly Performance Table */}
      <div className={styles.monthlySection}>
        <h3 className="section-title">Monthly Performance</h3>
        <div className={styles.monthlyTable}>
          <div className={styles.monthlyHeader}>
            <span>Month</span><span>Sessions</span><span>Profit</span><span>Win Rate</span>
          </div>
          {monthlyPerformance.map((month, i) => (
            <div key={month.month} className={styles.monthlyRow} style={{ animationDelay: `${i * 40}ms` }}>
              <span className={styles.monthLabel}>{month.label}</span>
              <span className={styles.monthSessions}>{month.sessions}</span>
              <span className={`${styles.monthProfit} ${month.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                {formatCurrency(month.profit, 'EUR', true)}
              </span>
              <div className={styles.monthWinRate}>
                <div className={styles.winRateBar}><div className={styles.winRateFill} style={{ width: `${month.winRate}%` }} /></div>
                <span>{month.winRate.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
