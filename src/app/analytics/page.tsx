'use client';

import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  Target,
  BarChart3,
  DollarSign,
  CreditCard,
  Clock,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';
import { useSessionStore } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useI18n } from '@/i18n';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  getSessionProfit,
  getSessionBuyIn,
  filterSessionsByTime,
  platformLabels,
  isSessionProfitable,
  isoToDateInput,
  sortSessionsAsc,
  getTimeFilterDate,
} from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { TimeFilter, Platform } from '@/types';
import styles from './page.module.css';

const Line = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), { ssr: false });
const Bar = dynamic(() => import('react-chartjs-2').then((mod) => mod.Bar), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then((mod) => mod.Doughnut), { ssr: false });

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const timeFilters: { id: TimeFilter; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
];

/**
 * AnalyticsPage — Rigorous end-of-session MTT telemetry & bankroll analytics.
 */
export default function AnalyticsPage() {
  const { t, locale, formatMessage } = useI18n();
  const sessions = useSessionStore((s) => s.sessions);
  const getStats = useSessionStore((s) => s.getStats);
  const accounts = useBankrollStore((s) => s.accounts);
  const transactions = useBankrollStore((s) => s.transactions);
  const settings = useSettingsStore((s) => s.settings);
  const currency = settings?.currency || 'EUR';
  const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  const [filter, setFilter] = useState<TimeFilter>('all');

  const filtered = useMemo(() => filterSessionsByTime(sessions, filter), [sessions, filter]);
  const stats = useMemo(() => getStats(filtered), [getStats, filtered]);

  // Deep MTT Telemetry: ATH, Current Drawdown, Max Drawdown, Worst Session, Grind Speed
  const deepMetrics = useMemo(() => {
    const sorted = sortSessionsAsc(filtered);
    let running = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let worstSession = 0;

    sorted.forEach((s) => {
      const p = getSessionProfit(s);
      if (p < worstSession) worstSession = p;
      running += p;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    const currentDrawdown = Math.max(0, peak - running);
    const currentDrawdownAbis = stats.avgBuyIn > 0 ? currentDrawdown / stats.avgBuyIn : 0;
    const maxDrawdownAbis = stats.avgBuyIn > 0 ? maxDrawdown / stats.avgBuyIn : 0;
    const totalHours = filtered.reduce((sum, s) => sum + s.duration / 60, 0);
    const totalCashes = filtered.reduce((sum, s) => sum + s.cashesCount, 0);
    const mttsPerHour = totalHours > 0 ? stats.totalTournaments / totalHours : 0;

    return {
      peak,
      currentDrawdown,
      currentDrawdownAbis,
      maxDrawdown,
      maxDrawdownAbis,
      worstSession,
      totalHours,
      totalCashes,
      mttsPerHour,
    };
  }, [filtered, stats.avgBuyIn, stats.totalTournaments]);

  // 8 Telemetry KPI Cards
  const statCards = useMemo(() => {
    const streakStr =
      stats.currentStreak > 0
        ? `+${stats.currentStreak}`
        : stats.currentStreak < 0
          ? `${stats.currentStreak}`
          : '0';

    return [
      {
        key: 'profit',
        label: t.analytics.totalProfit,
        value: `${formatCurrency(stats.totalProfit, currency, true)} (${stats.winRate.toFixed(0)}% W)`,
        tooltip: t.tooltips.totalProfit,
        icon: <DollarSign size={18} />,
        color: stats.totalProfit >= 0 ? 'green' : 'red',
      },
      {
        key: 'roi',
        label: t.analytics.roi,
        value: formatPercent(stats.roi),
        tooltip: t.tooltips.roi,
        icon: <TrendingUp size={18} />,
        color: stats.roi >= 0 ? 'blue' : 'red',
      },
      {
        key: 'itm',
        label: t.analytics.itm,
        value: `${stats.itm.toFixed(1)}% (${deepMetrics.totalCashes}/${stats.totalTournaments})`,
        tooltip: t.tooltips.itm,
        icon: <Target size={18} />,
        color: 'purple',
      },
      {
        key: 'volume',
        label: t.analytics.volume,
        value: `${formatNumber(stats.totalTournaments)} MTT (${stats.totalSessions}s)`,
        tooltip: t.tooltips.volume,
        icon: <BarChart3 size={18} />,
        color: 'gold',
      },
      {
        key: 'abi',
        label: t.analytics.avgBuyIn,
        value: formatCurrency(stats.avgBuyIn, currency),
        tooltip: t.tooltips.avgBuyIn,
        icon: <CreditCard size={18} />,
        color: 'blue',
      },
      {
        key: 'hourly',
        label: t.analytics.hourlyRate,
        value: `${formatCurrency(stats.hourlyRate, currency, true)}/h (${deepMetrics.mttsPerHour.toFixed(1)} MTT/h)`,
        tooltip: t.tooltips.hourlyRate,
        icon: <Clock size={18} />,
        color: stats.hourlyRate >= 0 ? 'green' : 'red',
      },
      {
        key: 'drawdown',
        label: `${t.analytics.maxDrawdown} / DD`,
        value:
          deepMetrics.maxDrawdown > 0
            ? `-${formatCurrency(deepMetrics.maxDrawdown, currency)} (${deepMetrics.maxDrawdownAbis.toFixed(0)}x ABI)`
            : t.analytics.atPeak,
        tooltip: t.tooltips.variance,
        icon: <ShieldAlert size={18} />,
        color: deepMetrics.currentDrawdown > 0 ? 'red' : 'green',
      },
      {
        key: 'extremes',
        label: `${t.analytics.biggestWin} / ${t.analytics.currentStreak}`,
        value: `${formatCurrency(stats.biggestWin, currency, true)} · ${streakStr}`,
        tooltip: `${t.analytics.worstSession}: ${formatCurrency(deepMetrics.worstSession, currency, true)}`,
        icon: <Flame size={18} />,
        color: stats.currentStreak < 0 ? 'red' : 'gold',
      },
    ];
  }, [stats, t, currency, deepMetrics]);

  // --- 1A: Cumulative Net Profit Over Time ---
  const cumulativeChart = useMemo(() => {
    const sorted = sortSessionsAsc(filtered);
    let runningProfit = 0;
    const labels: string[] = ['Start'];
    const data: number[] = [0];

    const profitByDay = new Map<string, number>();
    sorted.forEach((s) => {
      const key = isoToDateInput(s.date);
      profitByDay.set(key, (profitByDay.get(key) || 0) + getSessionProfit(s));
    });

    Array.from(profitByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([dateStr, dailyProfit]) => {
        runningProfit = Math.round((runningProfit + dailyProfit) * 100) / 100;
        const parts = dateStr.split('-');
        labels.push(`${parts[1]}/${parts[2]}`);
        data.push(runningProfit);
      });

    const isPositive = runningProfit >= 0;
    const color = isPositive ? '#00e599' : '#ff3b5c';
    const rgbColor = isPositive ? '0,229,153' : '255,59,92';

    return {
      labels,
      datasets: [
        {
          data,
          fill: true,
          borderColor: color,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return `rgba(${rgbColor},0.1)`;
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, `rgba(${rgbColor},0.25)`);
            gradient.addColorStop(1, `rgba(${rgbColor},0)`);
            return gradient;
          },
          cubicInterpolationMode: 'monotone' as const,
          pointRadius: labels.length <= 24 ? 3 : 0,
          pointHoverRadius: 5,
          borderWidth: 2,
          pointBackgroundColor: color,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        },
      ],
    };
  }, [filtered]);

  // --- 1B: Playable Bankroll Over Time (Anchored at Window Start & Today) ---
  const bankrollChart = useMemo(() => {
    const totalBankroll = accounts
      .filter((a) => a.category === 'poker_room')
      .reduce((sum, a) => sum + a.balance, 0);

    const playableAccountIds = new Set(
      accounts.filter((a) => a.category === 'poker_room').map((a) => a.id)
    );

    const dayChanges = new Map<string, number>();
    let earliestDay = format(new Date(), 'yyyy-MM-dd');

    transactions.forEach((tx) => {
      if (playableAccountIds.has(tx.accountId) && tx.notes !== 'Initial Balance') {
        const delta = tx.type === 'withdrawal' ? -Math.abs(tx.amount) : tx.amount;
        const key = isoToDateInput(tx.date);
        dayChanges.set(key, (dayChanges.get(key) || 0) + delta);
        if (key < earliestDay) earliestDay = key;
      }
    });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const baselineStartD = new Date(`${earliestDay}T12:00:00Z`);
    baselineStartD.setUTCDate(baselineStartD.getUTCDate() - 1);
    const todayD = new Date(`${todayStr}T12:00:00Z`);

    const totalSpanDays = Math.min(
      3650,
      Math.max(2, Math.ceil((todayD.getTime() - baselineStartD.getTime()) / 86400000) + 1)
    );

    const allDays: string[] = [];
    for (let i = 0; i < totalSpanDays; i++) {
      const d = new Date(baselineStartD.getTime() + i * 86400000);
      allDays.push(d.toISOString().split('T')[0]);
    }

    const byDay = new Map<string, number>();
    let runningBankroll = totalBankroll;
    for (let i = allDays.length - 1; i >= 0; i--) {
      const key = allDays[i];
      byDay.set(key, Math.round(runningBankroll * 100) / 100);
      if (dayChanges.has(key)) {
        runningBankroll -= dayChanges.get(key)!;
      }
    }

    let chronologicalDays = Array.from(byDay.keys()).sort();

    if (filter !== 'all') {
      const cutoffDate = getTimeFilterDate(filter);
      const cutoffStr = format(cutoffDate, 'yyyy-MM-dd');
      const filteredDays = chronologicalDays.filter((d) => d >= cutoffStr);
      if (filteredDays.length >= 2) {
        chronologicalDays = filteredDays;
      } else {
        // Anchor cleanly at cutoffStr & todayStr even when no tx occurred in window
        chronologicalDays = [cutoffStr, todayStr];
        if (!byDay.has(cutoffStr)) byDay.set(cutoffStr, totalBankroll);
        if (!byDay.has(todayStr)) byDay.set(todayStr, totalBankroll);
      }
    }

    return {
      labels: chronologicalDays.map((d) => {
        const parts = d.split('-');
        return `${parts[1]}/${parts[2]}`;
      }),
      datasets: [
        {
          data: chronologicalDays.map((d) => byDay.get(d) ?? totalBankroll),
          fill: true,
          borderColor: '#00d2ff',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'rgba(0,210,255,0.1)';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(0,210,255,0.25)');
            gradient.addColorStop(1, 'rgba(0,210,255,0)');
            return gradient;
          },
          cubicInterpolationMode: 'monotone' as const,
          pointRadius: chronologicalDays.length <= 24 ? 3 : 0,
          pointHoverRadius: 5,
          borderWidth: 2,
          pointBackgroundColor: '#00d2ff',
          pointHoverBackgroundColor: '#00d2ff',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        },
      ],
    };
  }, [transactions, filter, accounts]);

  // --- 2A: Rolling Cumulative ROI % & Session ABI Over Time (Replaces misleading ROI by Buy-In Level) ---
  const rollingRoiAbiChart = useMemo(() => {
    const sorted = sortSessionsAsc(filtered);
    let cumProfit = 0;
    let cumBuyIns = 0;

    const labels: string[] = [];
    const rollingRois: number[] = [];
    const sessionAbis: number[] = [];

    sorted.forEach((s, idx) => {
      cumProfit += getSessionProfit(s);
      cumBuyIns += s.totalBuyIns;
      const roi = cumBuyIns > 0 ? Math.round(((cumProfit / cumBuyIns) * 100) * 10) / 10 : 0;
      const abi = Math.round(getSessionBuyIn(s) * 100) / 100;
      const dateStr = isoToDateInput(s.date);
      const parts = dateStr.split('-');
      labels.push(`#${idx + 1} (${parts[1]}/${parts[2]})`);
      rollingRois.push(roi);
      sessionAbis.push(abi);
    });

    return {
      labels,
      datasets: [
        {
          label: t.analytics.rollingRoiLabel,
          data: rollingRois,
          yAxisID: 'yRoi',
          borderColor: '#00e599',
          backgroundColor: 'rgba(0, 229, 153, 0.14)',
          fill: true,
          cubicInterpolationMode: 'monotone' as const,
          pointRadius: labels.length <= 24 ? 3 : 1,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        {
          label: `${t.analytics.sessionAbiLabel} (${sym})`,
          data: sessionAbis,
          yAxisID: 'yAbi',
          borderColor: '#9d5cff',
          backgroundColor: 'rgba(157, 92, 255, 0.12)',
          borderDash: [5, 4],
          fill: false,
          cubicInterpolationMode: 'monotone' as const,
          pointRadius: labels.length <= 24 ? 3 : 1,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
      ],
    };
  }, [filtered, t.analytics.rollingRoiLabel, t.analytics.sessionAbiLabel, sym]);

  // --- 2B: Real Net Profit by Poker Room (From Synced Ledger + Single-Room Sessions) ---
  const roomProfitData = useMemo(() => {
    const filteredSessionIds = new Set(filtered.map((s) => s.id));
    const accountById = new Map(accounts.map((a) => [a.id, a]));
    const cutoffStr = filter === 'all' ? '' : format(getTimeFilterDate(filter), 'yyyy-MM-dd');

    const profitByRoom = new Map<string, { label: string; profit: number; syncedCount: number }>();
    const sessionsCoveredByLedger = new Set<string>();

    // 1. Exact per-room ledger movements (`session_result` on `poker_room` accounts)
    transactions.forEach((tx) => {
      if (tx.type !== 'session_result') return;
      const acc = accountById.get(tx.accountId);
      if (!acc || acc.category !== 'poker_room') return;

      if (tx.sessionId) {
        if (!filteredSessionIds.has(tx.sessionId)) return;
        sessionsCoveredByLedger.add(tx.sessionId);
      } else {
        // Quick sync adjustment within window
        if (cutoffStr && isoToDateInput(tx.date) < cutoffStr) return;
      }

      const key = acc.platform !== 'other' ? acc.platform : acc.name;
      const label =
        acc.platform !== 'other'
          ? platformLabels[acc.platform] || acc.name
          : acc.name;

      const entry = profitByRoom.get(key) || { label, profit: 0, syncedCount: 0 };
      entry.profit = Math.round((entry.profit + tx.amount) * 100) / 100;
      entry.syncedCount += 1;
      profitByRoom.set(key, entry);
    });

    // 2. Include unsynced single-room sessions so standalone sessions are also represented accurately
    filtered.forEach((s) => {
      if (sessionsCoveredByLedger.has(s.id)) return;
      if (s.platforms.length === 1) {
        const plat = s.platforms[0];
        const label = platformLabels[plat] || plat;
        const entry = profitByRoom.get(plat) || { label, profit: 0, syncedCount: 0 };
        entry.profit = Math.round((entry.profit + getSessionProfit(s)) * 100) / 100;
        entry.syncedCount += 1;
        profitByRoom.set(plat, entry);
      }
    });

    const sortedRooms = Array.from(profitByRoom.values()).sort((a, b) => b.profit - a.profit);

    return {
      labels: sortedRooms.map((r) => r.label),
      profits: sortedRooms.map((r) => r.profit),
      counts: sortedRooms.map((r) => r.syncedCount),
      datasets: [
        {
          label: t.analytics.roomNetProfitLabel,
          data: sortedRooms.map((r) => r.profit),
          backgroundColor: sortedRooms.map((r) =>
            r.profit >= 0 ? 'rgba(0, 229, 153, 0.65)' : 'rgba(255, 59, 92, 0.65)'
          ),
          borderColor: sortedRooms.map((r) => (r.profit >= 0 ? '#00e599' : '#ff3b5c')),
          borderWidth: 1,
          borderRadius: 5,
        },
      ],
    };
  }, [filtered, accounts, transactions, filter, t.analytics.roomNetProfitLabel]);

  // --- 3A: ROI % & Efficiency by Grind Intensity (MTT/h) ---
  const grindIntensityChart = useMemo(() => {
    const b1 = t.analytics.intensityFocused;
    const b2 = t.analytics.intensityStandard;
    const b3 = t.analytics.intensityMass;

    const buckets: Record<string, { profit: number; cost: number; sessions: number; mtts: number }> = {
      [b1]: { profit: 0, cost: 0, sessions: 0, mtts: 0 },
      [b2]: { profit: 0, cost: 0, sessions: 0, mtts: 0 },
      [b3]: { profit: 0, cost: 0, sessions: 0, mtts: 0 },
    };

    filtered.forEach((s) => {
      const hrs = s.duration > 0 ? s.duration / 60 : 1;
      const speed = s.eventCount / hrs;
      const key = speed < 5 ? b1 : speed <= 8 ? b2 : b3;
      buckets[key].profit += getSessionProfit(s);
      buckets[key].cost += s.totalBuyIns;
      buckets[key].sessions += 1;
      buckets[key].mtts += s.eventCount;
    });

    const labels = [b1, b2, b3];
    const rois = labels.map((l) =>
      buckets[l].cost > 0 ? Math.round(((buckets[l].profit / buckets[l].cost) * 100) * 10) / 10 : 0
    );

    return {
      labels,
      rois,
      sessions: labels.map((l) => buckets[l].sessions),
      mtts: labels.map((l) => buckets[l].mtts),
      datasets: [
        {
          label: 'ROI %',
          data: rois,
          backgroundColor: rois.map((r) =>
            r >= 0 ? 'rgba(0, 210, 255, 0.6)' : 'rgba(255, 59, 92, 0.6)'
          ),
          borderColor: rois.map((r) => (r >= 0 ? '#00d2ff' : '#ff3b5c')),
          borderWidth: 1,
          borderRadius: 5,
        },
      ],
    };
  }, [filtered, t.analytics.intensityFocused, t.analytics.intensityStandard, t.analytics.intensityMass]);

  // --- 3B: Session Volume by Platform ---
  const platformChart = useMemo(() => {
    const byPlatform: Record<string, number> = {};
    filtered.forEach((s) => {
      s.platforms.forEach((p) => {
        byPlatform[p] = (byPlatform[p] || 0) + 1;
      });
    });
    const labels = Object.keys(byPlatform).map(
      (k) => platformLabels[k as Platform] || k
    );
    return {
      labels,
      datasets: [
        {
          data: Object.values(byPlatform),
          backgroundColor: [
            '#00d2ff',
            '#9d5cff',
            '#ffb800',
            '#00e599',
            '#ff3b5c',
            '#ec4899',
            '#6366f1',
            '#14b8a6',
          ],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    };
  }, [filtered]);

  // --- 4A: Session Results Distribution (Dynamic ABI Multiples) ---
  const resultsDistribution = useMemo(() => {
    const abiUnit = stats.avgBuyIn > 0 ? stats.avgBuyIn : 10;
    const labels = [
      '<-20x ABI',
      '-20..-10x',
      '-10..0x',
      '0..+10x',
      '+10..+30x',
      '>+30x ABI',
    ];
    const counts = [0, 0, 0, 0, 0, 0];

    filtered.forEach((s) => {
      const mult = getSessionProfit(s) / abiUnit;
      if (mult < -20) counts[0]++;
      else if (mult < -10) counts[1]++;
      else if (mult < 0) counts[2]++;
      else if (mult <= 10) counts[3]++;
      else if (mult <= 30) counts[4]++;
      else counts[5]++;
    });

    return {
      labels,
      abiUnit,
      datasets: [
        {
          label: t.profile.sessions,
          data: counts,
          backgroundColor: [
            'rgba(255,59,92,0.82)',
            'rgba(255,59,92,0.55)',
            'rgba(255,59,92,0.3)',
            'rgba(0,229,153,0.32)',
            'rgba(0,229,153,0.62)',
            'rgba(0,229,153,0.92)',
          ],
          borderWidth: 0,
          borderRadius: 4,
        },
      ],
    };
  }, [filtered, stats.avgBuyIn, t.profile.sessions]);

  // --- 4B: Net Profit by Day of Week (Timezone-safe) ---
  const profitByDayOfWeek = useMemo(() => {
    const days = t.analytics.daysShort;
    const buckets = [0, 0, 0, 0, 0, 0, 0];

    filtered.forEach((s) => {
      const parsed = parseISO(s.date);
      const dayIndex = isNaN(parsed.getTime()) ? 0 : parsed.getDay();
      buckets[dayIndex] = Math.round((buckets[dayIndex] + getSessionProfit(s)) * 100) / 100;
    });

    return {
      labels: days,
      datasets: [
        {
          label: t.sessions.profit,
          data: buckets,
          backgroundColor: buckets.map((b) =>
            b >= 0 ? 'rgba(0,229,153,0.6)' : 'rgba(255,59,92,0.6)'
          ),
          borderColor: buckets.map((b) => (b >= 0 ? '#00e599' : '#ff3b5c')),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [filtered, t.analytics.daysShort, t.sessions.profit]);

  // --- Monthly Performance Breakdown ---
  const monthlyPerformance = useMemo(() => {
    const byMonth = new Map<
      string,
      { sessions: number; mtts: number; buyIns: number; profit: number; wins: number }
    >();
    filtered.forEach((s) => {
      const key = isoToDateInput(s.date).substring(0, 7);
      const entry = byMonth.get(key) || { sessions: 0, mtts: 0, buyIns: 0, profit: 0, wins: 0 };
      entry.sessions++;
      entry.mtts += s.eventCount || 1;
      entry.buyIns += s.totalBuyIns;
      entry.profit += getSessionProfit(s);
      if (isSessionProfitable(s)) entry.wins++;
      byMonth.set(key, entry);
    });

    return Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, data]) => ({
        month,
        label: new Date(`${month}-15T12:00:00Z`).toLocaleDateString(
          locale === 'it' ? 'it-IT' : 'en-US',
          { month: 'short', year: 'numeric' }
        ),
        ...data,
        roi: data.buyIns > 0 ? (data.profit / data.buyIns) * 100 : 0,
        winRate: data.sessions > 0 ? (data.wins / data.sessions) * 100 : 0,
      }));
  }, [filtered, locale]);

  // Shared Chart Options
  const currencyLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0c111e',
        titleColor: '#f0f6fc',
        bodyColor: '#8b9bb4',
        padding: 12,
        displayColors: false,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => formatCurrency(Number(ctx.raw || 0), currency, true),
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#64748b', maxTicksLimit: 12, maxRotation: 45 },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ticks: { color: '#64748b', callback: (v: any) => `${sym}${v}` },
      },
    },
  };

  const dualRoiAbiOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { color: '#94a3b8', usePointStyle: true, boxWidth: 8, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: '#0c111e',
        titleColor: '#f0f6fc',
        bodyColor: '#cbd5e1',
        padding: 12,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => {
            if (ctx.dataset.yAxisID === 'yRoi') {
              return `${t.analytics.rollingRoiLabel}: ${formatPercent(Number(ctx.raw || 0), 1)}`;
            }
            return `${t.analytics.sessionAbiLabel}: ${formatCurrency(Number(ctx.raw || 0), currency)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#64748b', maxTicksLimit: 10, maxRotation: 35 },
      },
      yRoi: {
        type: 'linear' as const,
        position: 'left' as const,
        grid: { color: 'rgba(255,255,255,0.04)' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ticks: { color: '#00e599', callback: (v: any) => `${v}%` },
      },
      yAbi: {
        type: 'linear' as const,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ticks: { color: '#9d5cff', callback: (v: any) => `${sym}${v}` },
      },
    },
  };

  const percentBarOptions = {
    ...currencyLineOptions,
    plugins: {
      ...currencyLineOptions.plugins,
      tooltip: {
        ...currencyLineOptions.plugins.tooltip,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `ROI: ${formatPercent(Number(ctx.raw || 0), 1)}`,
        },
      },
    },
    scales: {
      ...currencyLineOptions.scales,
      y: {
        ...currencyLineOptions.scales.y,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ticks: { color: '#64748b', callback: (v: any) => `${v}%` },
      },
    },
  };

  const histOptions = {
    ...currencyLineOptions,
    plugins: {
      ...currencyLineOptions.plugins,
      tooltip: {
        ...currencyLineOptions.plugins.tooltip,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) =>
            `${ctx.raw} ${t.profile.sessions} (1x ABI ≈ ${formatCurrency(resultsDistribution.abiUnit, currency)})`,
        },
      },
    },
    scales: {
      ...currencyLineOptions.scales,
      y: {
        ...currencyLineOptions.scales.y,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ticks: { color: '#64748b', stepSize: 1, callback: (v: any) => v },
      },
    },
  };

  if (filtered.length === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">{t.analytics.title}</h1>
          <div className={styles.timeFilters}>
            {timeFilters.map((tf) => (
              <button
                key={tf.id}
                className={`${styles.filterBtn} ${filter === tf.id ? styles.activeFilter : ''}`}
                onClick={() => setFilter(tf.id)}
              >
                {tf.id === 'all' ? t.time.all : tf.label}
              </button>
            ))}
          </div>
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-20)',
            color: 'var(--text-muted)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <BarChart3 size={56} style={{ margin: '0 auto var(--space-4)', color: 'var(--accent-blue)' }} />
          <h2
            style={{
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-2)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {sessions.length === 0
              ? t.analytics.noData
              : formatMessage('analytics.noSessionsInWindow', { window: filter.toUpperCase() })}
          </h2>
          <p style={{ marginBottom: '16px' }}>
            {sessions.length === 0
              ? t.analytics.playMore
              : formatMessage('analytics.windowHasTotalSessions', { total: sessions.length })}
          </p>
          {sessions.length > 0 && filter !== 'all' && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-primary)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {formatMessage('analytics.showAllTime', { total: sessions.length })}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{t.analytics.title}</h1>
        <div className={styles.timeFilters}>
          {timeFilters.map((tf) => (
            <button
              key={tf.id}
              className={`${styles.filterBtn} ${filter === tf.id ? styles.activeFilter : ''}`}
              onClick={() => setFilter(tf.id)}
            >
              {tf.id === 'all' ? t.time.all : tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Telemetry KPI Grid */}
      <div className={styles.statsGrid}>
        {statCards.map((card, i) => (
          <div
            key={card.key}
            className={`${styles.miniStat} ${styles[`c${card.color}`]}`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className={styles.miniIcon}>{card.icon}</div>
            <span className={styles.miniLabel} style={{ display: 'flex', alignItems: 'center' }}>
              {card.label}
              <UITooltip content={card.tooltip} />
            </span>
            <span className={styles.miniValue}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Row 1: Cumulative Net Profit + Playable Bankroll Over Time */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard} style={{ animationDelay: '80ms' }}>
          <h2 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center' }}>
            {t.analytics.cumulativeProfit}
            <UITooltip content={t.tooltips.cumulativeProfit} position="right" />
          </h2>
          <div className={styles.chartWrap}>
            <Line data={cumulativeChart} options={currencyLineOptions} />
          </div>
        </div>

        <div className={styles.chartCard} style={{ animationDelay: '120ms' }}>
          <h2 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center' }}>
            {t.analytics.bankrollOverTime}
            <UITooltip content={t.tooltips.bankrollHistory} position="left" />
          </h2>
          <div className={styles.chartWrap}>
            <Line data={bankrollChart} options={currencyLineOptions} />
          </div>
        </div>
      </div>

      {/* Row 2: Rolling ROI % & ABI Trend + Real Net Profit by Poker Room */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard} style={{ animationDelay: '160ms' }}>
          <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center' }}>
            {t.analytics.rollingRoiAbi}
            <UITooltip content={t.tooltips.rollingRoi} position="right" />
          </h3>
          <div className={styles.chartWrap}>
            <Line data={rollingRoiAbiChart} options={dualRoiAbiOptions} />
          </div>
        </div>

        <div className={styles.chartCard} style={{ animationDelay: '200ms' }}>
          <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center' }}>
            {t.analytics.roomProfitLedger}
            <UITooltip content={t.tooltips.roomProfit} position="left" />
          </h3>
          <div className={styles.chartWrap}>
            <Bar
              data={{ labels: roomProfitData.labels, datasets: roomProfitData.datasets }}
              options={currencyLineOptions}
            />
          </div>
          {roomProfitData.labels.length > 0 && (
            <div className={styles.bucketCounts}>
              {roomProfitData.labels.map((label, i) => (
                <span key={label} className={styles.bucketCount}>
                  {label}: {formatCurrency(roomProfitData.profits[i], currency, true)} ({roomProfitData.counts[i]})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: ROI % by Grind Intensity (MTT/h) + Volume Breakdown by Room */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard} style={{ animationDelay: '240ms' }}>
          <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center' }}>
            {t.analytics.grindIntensityRoi}
            <UITooltip content={t.tooltips.grindIntensity} position="right" />
          </h3>
          <div className={styles.chartWrap}>
            <Bar
              data={{ labels: grindIntensityChart.labels, datasets: grindIntensityChart.datasets }}
              options={percentBarOptions}
            />
          </div>
          <div className={styles.bucketCounts}>
            {grindIntensityChart.labels.map((label, i) => (
              <span key={label} className={styles.bucketCount}>
                {label}: {grindIntensityChart.mtts[i]} MTT ({grindIntensityChart.sessions[i]}s)
              </span>
            ))}
          </div>
        </div>

        <div className={styles.chartCard} style={{ animationDelay: '280ms' }}>
          <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center' }}>
            {t.analytics.platformBreakdown}
            <UITooltip content={t.tooltips.platforms} position="left" />
          </h3>
          <div className={styles.chartWrapSmall}>
            <Doughnut
              data={platformChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom' as const,
                    labels: { color: '#94a3b8', padding: 14, usePointStyle: true, font: { size: 12 } },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Row 4: Dynamic ABI-Multiple Results Histogram + Net Profit by Day of Week */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard} style={{ animationDelay: '320ms' }}>
          <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center' }}>
            {t.analytics.resultsDistribution}
            <UITooltip content={t.tooltips.abiDistribution} position="right" />
          </h3>
          <div className={styles.chartWrap}>
            <Bar data={resultsDistribution} options={histOptions} />
          </div>
        </div>

        <div className={styles.chartCard} style={{ animationDelay: '360ms' }}>
          <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center' }}>
            {t.analytics.performanceByDay}
          </h3>
          <div className={styles.chartWrap}>
            <Bar data={profitByDayOfWeek} options={currencyLineOptions} />
          </div>
        </div>
      </div>

      {/* Monthly Performance Table */}
      <div className={styles.monthlySection}>
        <h3 className="section-title">{t.analytics.monthlyPerformance}</h3>
        <div className={styles.monthlyTable}>
          <div className={styles.monthlyHeader}>
            <span>{t.analytics.month}</span>
            <span>{t.analytics.volume}</span>
            <span>{t.sessions.profit} / ROI</span>
            <span>{t.analytics.winRate}</span>
          </div>
          {monthlyPerformance.map((month, i) => (
            <div
              key={month.month}
              className={styles.monthlyRow}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={styles.monthLabel} style={{ textTransform: 'capitalize' }}>
                {month.label}
              </span>
              <span className={styles.monthSessions}>
                {month.mtts} MTT ({month.sessions}s)
              </span>
              <span
                className={`${styles.monthProfit} ${
                  month.profit >= 0 ? 'profit-positive' : 'profit-negative'
                }`}
              >
                {formatCurrency(month.profit, currency, true)}{' '}
                <small style={{ fontWeight: 500, opacity: 0.8 }}>
                  ({formatPercent(month.roi, 1)})
                </small>
              </span>
              <div className={styles.monthWinRate}>
                <div className={styles.winRateBar}>
                  <div className={styles.winRateFill} style={{ width: `${month.winRate}%` }} />
                </div>
                <span>{month.winRate.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
