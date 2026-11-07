'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import dynamic from 'next/dynamic';
import {
  Wallet,
  Shield,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  CreditCard,
  X,
  Building2,
  Coins,
  Cpu,
  Link2,
  Download,
  Loader2,
} from 'lucide-react';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useSessionStore } from '@/stores/session-store';
import { useSettingsStore } from '@/stores/settings-store';
import { SyncBalancesModal } from '@/components/ui/SyncBalancesModal';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { format } from 'date-fns';
import {
  formatCurrency,
  formatDate,
  getBankrollHealth,
  platformLabels,
  cn,
  isoToDateInput,
  downloadCsv,
} from '@/lib/utils';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';
import type { Platform, BankrollCategory } from '@/types';
import styles from './page.module.css';

const Line = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then((mod) => mod.Doughnut), { ssr: false });

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const categoryIcons: Record<string, React.ReactNode> = {
  poker_room: <Coins size={16} />,
  e_wallet: <Wallet size={16} />,
  crypto: <Cpu size={16} />,
  bank_account: <Building2 size={16} />,
  cash: <CreditCard size={16} />,
};

export default function BankrollPage() {
  const { t, locale, formatMessage } = useI18n();
  const { toast } = useToast();
  const accounts = useBankrollStore((s) => s.accounts);
  const transactions = useBankrollStore((s) => s.transactions);
  const addTransaction = useBankrollStore((s) => s.addTransaction);
  const deleteTransaction = useBankrollStore((s) => s.deleteTransaction);
  const transferFunds = useBankrollStore((s) => s.transferFunds);
  const addAccount = useBankrollStore((s) => s.addAccount);
  const deleteAccount = useBankrollStore((s) => s.deleteAccount);

  const getStats = useSessionStore((s) => s.getStats);
  const sessions = useSessionStore((s) => s.sessions);
  const settings = useSettingsStore((s) => s.settings);
  const currency = settings?.currency || 'EUR';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  const stats = useMemo(() => getStats(sessions), [getStats, sessions]);

  const [showTxModal, setShowTxModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [deleteAccConfirmId, setDeleteAccConfirmId] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<'all' | 'sessions' | 'cashflow' | 'transfers'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reversingTxId, setReversingTxId] = useState<string | null>(null);

  const [txForm, setTxForm] = useState({
    type: 'deposit' as 'deposit' | 'withdrawal',
    amount: '',
    accountId: '',
    notes: '',
  });
  const [accForm, setAccForm] = useState({
    platform: 'pokerstars' as Platform,
    name: 'PokerStars',
    balance: '',
    category: 'poker_room' as BankrollCategory,
  });
  const [transferForm, setTransferForm] = useState({
    fromId: '',
    toId: '',
    amount: '',
    notes: '',
  });

  const playableBankroll = useMemo(
    () => accounts.filter((a) => a.category === 'poker_room').reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );
  const totalPortfolio = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );
  const health = useMemo(
    () => getBankrollHealth(playableBankroll, stats.avgBuyIn, 'mtt'),
    [playableBankroll, stats.avgBuyIn]
  );

  // Cashflow & Staking KPI summary (excluding internal 2-leg transfers & Initial Balance baselines)
  const cashflowKpis = useMemo(() => {
    let externalDeposits = 0;
    let realLifeCashouts = 0;
    let syncedSessionNet = 0;

    transactions.forEach((tx) => {
      const isLegacyTransfer = tx.notes?.includes('→') || tx.notes?.includes('←');
      if (tx.type === 'transfer' || isLegacyTransfer) return;

      if (tx.type === 'deposit' && tx.notes !== 'Initial Balance') {
        externalDeposits += Math.abs(tx.amount);
      } else if (tx.type === 'withdrawal') {
        realLifeCashouts += Math.abs(tx.amount);
      } else if (tx.type === 'session_result') {
        syncedSessionNet += tx.amount;
      }
    });

    return {
      externalDeposits: Math.round(externalDeposits * 100) / 100,
      realLifeCashouts: Math.round(realLifeCashouts * 100) / 100,
      syncedSessionNet: Math.round(syncedSessionNet * 100) / 100,
    };
  }, [transactions]);

  const healthColors: Record<string, string> = {
    healthy: 'var(--accent-green)',
    caution: 'var(--accent-gold)',
    danger: 'var(--accent-red)',
  };
  const healthLabels: Record<string, string> = {
    healthy: t.bankroll.healthy,
    caution: t.bankroll.caution,
    danger: t.bankroll.danger,
  };
  const healthDesc: Record<string, string> = {
    healthy: t.bankroll.healthyDesc,
    caution: t.bankroll.cautionDesc,
    danger: t.bankroll.dangerDesc,
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setShowTxModal(false);
        setShowAccModal(false);
        setShowTransferModal(false);
        setShowSyncModal(false);
      }
    };
    if (showTxModal || showAccModal || showTransferModal || showSyncModal) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showTxModal, showAccModal, showTransferModal, showSyncModal, isSubmitting]);

  // Historical Playable Bankroll Curve (Timezone-safe)
  const chartData = useMemo(() => {
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
    const startD = new Date(`${earliestDay}T12:00:00Z`);
    startD.setUTCDate(startD.getUTCDate() - 1);
    const todayD = new Date(`${todayStr}T12:00:00Z`);
    const totalDays = Math.min(
      3650,
      Math.max(2, Math.ceil((todayD.getTime() - startD.getTime()) / 86400000) + 1)
    );

    const allDays: string[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startD.getTime() + i * 86400000);
      allDays.push(d.toISOString().split('T')[0]);
    }

    const byDay = new Map<string, number>();
    let runningBankroll = playableBankroll;

    for (let i = allDays.length - 1; i >= 0; i--) {
      const key = allDays[i];
      byDay.set(key, Math.round(runningBankroll * 100) / 100);
      if (dayChanges.has(key)) {
        runningBankroll -= dayChanges.get(key)!;
      }
    }

    const chronologicalDays = Array.from(byDay.keys()).sort();

    return {
      labels: chronologicalDays.map((d) => {
        const parts = d.split('-');
        return `${parts[1]}/${parts[2]}`;
      }),
      datasets: [
        {
          data: chronologicalDays.map((d) => byDay.get(d)!),
          borderColor: '#00e599',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'rgba(0,229,153,0.1)';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(0,229,153,0.25)');
            gradient.addColorStop(1, 'rgba(0,229,153,0)');
            return gradient;
          },
          fill: true,
          cubicInterpolationMode: 'monotone' as const,
          pointRadius: chronologicalDays.length <= 24 ? 3 : 0,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
      ],
    };
  }, [transactions, playableBankroll, accounts]);

  const donutData = useMemo(() => {
    const data = accounts.filter((a) => a.balance > 0);
    return {
      labels: data.map((a) => a.name),
      datasets: [
        {
          data: data.map((a) => a.balance),
          backgroundColor: [
            '#00d2ff',
            '#9d5cff',
            '#ffb800',
            '#00e599',
            '#ff3b5c',
            '#ec4899',
            '#06b6d4',
          ],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    };
  }, [accounts]);

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !txForm.amount || !txForm.accountId) return;
    setIsSubmitting(true);
    try {
      await addTransaction({
        type: txForm.type,
        amount: parseFloat(txForm.amount),
        accountId: txForm.accountId,
        date: new Date().toISOString(),
        notes: txForm.notes,
      });
      toast.success(
        txForm.type === 'deposit' ? t.bankroll.depositSavedToast : t.bankroll.withdrawalSavedToast
      );
      setShowTxModal(false);
      setTxForm({ type: 'deposit', amount: '', accountId: '', notes: '' });
    } catch {
      toast.error(t.bankroll.txErrorToast);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAcc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || accForm.balance === '' || !accForm.name.trim()) return;
    setIsSubmitting(true);
    try {
      const trimmedName = accForm.name.trim();
      await addAccount({
        platform: accForm.category === 'poker_room' ? accForm.platform : 'other',
        name: trimmedName,
        balance: parseFloat(accForm.balance) || 0,
        currency,
        category: accForm.category,
      });
      toast.success(formatMessage('bankroll.accountCreatedToast', { name: trimmedName }));
      setShowAccModal(false);
      setAccForm({ platform: 'pokerstars', name: 'PokerStars', balance: '', category: 'poker_room' });
    } catch {
      toast.error(t.bankroll.txErrorToast);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      isSubmitting ||
      !transferForm.amount ||
      !transferForm.fromId ||
      !transferForm.toId ||
      transferForm.fromId === transferForm.toId
    )
      return;

    setIsSubmitting(true);
    try {
      await transferFunds(
        transferForm.fromId,
        transferForm.toId,
        parseFloat(transferForm.amount),
        transferForm.notes || 'Internal Transfer'
      );
      toast.success(t.bankroll.transferSavedToast);
      setShowTransferModal(false);
      setTransferForm({ fromId: '', toId: '', amount: '', notes: '' });
    } catch {
      toast.error(t.bankroll.txErrorToast);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAcc = async (id: string, name: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteAccount(id);
      setDeleteAccConfirmId(null);
      if (accountFilter === id) setAccountFilter('all');
      toast.info(formatMessage('bankroll.accountRemovedToast', { name }));
    } catch {
      toast.error(t.bankroll.txErrorToast);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (reversingTxId) return;
    setReversingTxId(id);
    try {
      await deleteTransaction(id);
      toast.info(t.bankroll.txReversedToast);
    } catch {
      toast.error(t.bankroll.txErrorToast);
    } finally {
      setReversingTxId(null);
    }
  };

  const [visibleTxCount, setVisibleTxCount] = useState(12);
  const sortedTx = useMemo(() => {
    const allSorted = [...transactions].sort((a, b) => {
      const d = new Date(b.date).getTime() - new Date(a.date).getTime();
      return d !== 0
        ? d
        : new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return allSorted.filter((tx) => {
      if (accountFilter !== 'all' && tx.accountId !== accountFilter) return false;
      if (txFilter === 'all') return true;
      const isTransfer =
        tx.type === 'transfer' || tx.notes?.includes('→') || tx.notes?.includes('←');
      if (txFilter === 'transfers') return isTransfer;
      if (txFilter === 'sessions') return tx.type === 'session_result';
      if (txFilter === 'cashflow')
        return !isTransfer && (tx.type === 'deposit' || tx.type === 'withdrawal');
      return true;
    });
  }, [transactions, txFilter, accountFilter]);

  const visibleTx = useMemo(() => sortedTx.slice(0, visibleTxCount), [sortedTx, visibleTxCount]);

  const handleExportLedgerCsv = useCallback(() => {
    const rows = sortedTx.map((tx) => {
      const acc = accounts.find((a) => a.id === tx.accountId);
      const signedAmt = tx.type === 'withdrawal' ? -Math.abs(tx.amount) : tx.amount;
      return [
        isoToDateInput(tx.date),
        acc?.name || 'Deleted Account',
        acc?.category || '',
        tx.type,
        signedAmt.toFixed(2),
        acc?.currency || currency,
        tx.sessionId || '',
        tx.transferGroupId || '',
        tx.notes || '',
      ];
    });
    downloadCsv(
      `grindhub-bankroll-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      [
        'Date',
        'Account',
        'Category',
        'Type',
        'Signed_Amount',
        'Currency',
        'Linked_Session_ID',
        'Transfer_Group_ID',
        'Notes',
      ],
      rows
    );
    toast.success(t.bankroll.exportedToast);
  }, [sortedTx, accounts, currency, toast, t.bankroll.exportedToast]);

  const chartOptions = {
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
          label: (ctx: any) => formatCurrency(ctx.raw, currency),
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
        ticks: { color: '#64748b', callback: (v: any) => `${currencySymbol}${v}` },
      },
    },
  };

  return (
    <>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">{t.bankroll.title}</h1>
        </div>

        <div className={styles.heroGrid}>
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <span className={styles.heroLabel}>{t.bankroll.playableBankroll}</span>
              <span
                className={styles.healthBadge}
                style={{ color: healthColors[health], borderColor: healthColors[health] }}
              >
                <Shield size={14} /> {healthLabels[health]}
              </span>
            </div>
            <div className={styles.heroValueWrap} style={{ display: 'flex', flexDirection: 'column' }}>
              <span className={styles.heroValue}>{formatCurrency(playableBankroll, currency)}</span>
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'rgba(255, 255, 255, 0.72)',
                  marginTop: '0.25rem',
                }}
              >
                {t.bankroll.totalPortfolioSub}: {formatCurrency(totalPortfolio, currency)}
              </span>
            </div>
            <p className={styles.healthDesc}>{healthDesc[health]}</p>

            {/* Cashflow & Staking KPI Summary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t.bankroll.externalDepositsKpi}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {formatCurrency(cashflowKpis.externalDeposits, currency)}
                </span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t.bankroll.realLifeCashoutsKpi}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--accent-gold)',
                  }}
                >
                  {formatCurrency(cashflowKpis.realLifeCashouts, currency)}
                </span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t.bankroll.netGamingProfitKpi}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color:
                      cashflowKpis.syncedSessionNet >= 0
                        ? 'var(--accent-green)'
                        : 'var(--accent-red)',
                  }}
                >
                  {formatCurrency(cashflowKpis.syncedSessionNet, currency, true)}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.actionsCard}>
            <h3 className={styles.actionsTitle}>{t.bankroll.quickActions}</h3>
            <div className={styles.actionsGrid}>
              <button className={styles.actionBtn} onClick={() => setShowSyncModal(true)}>
                <div className={cn(styles.actionIcon, styles.iconPurple)}>
                  <ArrowRightLeft size={20} />
                </div>
                <span>
                  {t.bankroll.quickSync}{' '}
                  <UITooltip content={t.tooltips.quickSync} position="top" />
                </span>
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  if (accounts.length === 0) {
                    toast.info(t.bankroll.createAccountFirstToast);
                    setShowAccModal(true);
                    return;
                  }
                  setTxForm((prev) => ({
                    ...prev,
                    type: 'deposit',
                    accountId: accounts[0]?.id || '',
                  }));
                  setShowTxModal(true);
                }}
              >
                <div className={cn(styles.actionIcon, styles.iconGreen)}>
                  <ArrowDownRight size={20} />
                </div>
                <span>{t.bankroll.deposit}</span>
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  if (accounts.length === 0) {
                    toast.info(t.bankroll.createAccountFirstToast);
                    setShowAccModal(true);
                    return;
                  }
                  setTxForm((prev) => ({
                    ...prev,
                    type: 'withdrawal',
                    accountId: accounts[0]?.id || '',
                  }));
                  setShowTxModal(true);
                }}
              >
                <div className={cn(styles.actionIcon, styles.iconRed)}>
                  <ArrowUpRight size={20} />
                </div>
                <span>{t.bankroll.withdrawal}</span>
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  if (accounts.length < 2) {
                    toast.info(t.bankroll.needTwoAccountsToast);
                    return;
                  }
                  setTransferForm((prev) => ({
                    ...prev,
                    fromId: accounts[0]?.id || '',
                    toId: accounts[1]?.id || '',
                  }));
                  setShowTransferModal(true);
                }}
              >
                <div className={cn(styles.actionIcon, styles.iconBlue)}>
                  <ArrowRightLeft size={20} />
                </div>
                <span>{t.bankroll.transfer}</span>
              </button>
              <button className={styles.actionBtn} onClick={() => setShowAccModal(true)}>
                <div className={cn(styles.actionIcon, styles.iconGold)}>
                  <Plus size={20} />
                </div>
                <span>{t.bankroll.newAccount}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Accounts Grid */}
        <h2 className={styles.sectionTitle} style={{ marginTop: '2rem', marginBottom: '1rem' }}>
          {t.bankroll.portfoliosAccounts}
        </h2>
        <div className={styles.accountsGrid}>
          {accounts.map((acc) => {
            const normalizedCategory =
              (acc.category as string) === 'wallet' ? 'e_wallet' : acc.category || 'poker_room';
            const iconCategory = categoryIcons[normalizedCategory as string]
              ? normalizedCategory
              : 'poker_room';
            const catLabel =
              normalizedCategory === 'poker_room'
                ? `${t.bankroll.pokerRoomCat} · ${platformLabels[acc.platform] || acc.platform}`
                : normalizedCategory === 'e_wallet'
                  ? t.bankroll.eWalletCat
                  : normalizedCategory === 'bank_account'
                    ? t.bankroll.bankAccountCat
                    : normalizedCategory === 'crypto'
                      ? t.bankroll.cryptoCat
                      : t.bankroll.cashCat;
            const isConfirmingDelete = deleteAccConfirmId === acc.id;

            return (
              <div key={acc.id} className={styles.accountCard}>
                <div className={styles.accTop}>
                  <div
                    className={cn(
                      styles.accIconWrap,
                      iconCategory === 'poker_room'
                        ? styles.cblue
                        : iconCategory === 'e_wallet'
                          ? styles.cgreen
                          : styles.cgold
                    )}
                  >
                    {categoryIcons[iconCategory as string]}
                  </div>
                  {isConfirmingDelete ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleDeleteAcc(acc.id, acc.name)}
                        title={t.bankroll.deleteAccWarn}
                        style={{
                          padding: '2px 6px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          background: 'var(--accent-red)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setDeleteAccConfirmId(null)}
                        title={t.common.cancel}
                        style={{
                          padding: '2px 6px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className={styles.deleteAccBtn}
                      onClick={() => setDeleteAccConfirmId(acc.id)}
                      title={t.bankroll.deleteAccWarn}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className={styles.accName}>{acc.name}</div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginBottom: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {catLabel}
                </div>
                <div className={styles.accBalance}>
                  {formatCurrency(acc.balance, acc.currency)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className={styles.mainGrid}>
          <div className={styles.chartsCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{t.bankroll.playableHistory}</h3>
              </div>
              <div className={styles.chartWrap}>
                {chartData.datasets[0].data.length > 0 ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {t.bankroll.emptyHistoryChart}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.sideCol}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{t.bankroll.portfolioAllocation}</h3>
              <div className={styles.donutWrap}>
                {accounts.filter((a) => a.balance > 0).length > 0 ? (
                  <Doughnut
                    data={donutData}
                    options={{
                      maintainAspectRatio: false,
                      cutout: '65%',
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { color: '#94a3b8', usePointStyle: true, padding: 20 },
                        },
                      },
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {t.bankroll.noFunds}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div
                className={styles.cardHeader}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className={styles.cardTitle}>
                    {t.bankroll.recentTransactions} ({sortedTx.length})
                  </h3>
                  {sortedTx.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExportLedgerCsv}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={12} /> {t.bankroll.exportCsv}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {accounts.length > 1 && (
                    <select
                      value={accountFilter}
                      onChange={(e) => setAccountFilter(e.target.value)}
                      style={{
                        padding: '3px 6px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-primary)',
                      }}
                    >
                      <option value="all">{t.bankroll.allAccountsFilter}</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {(
                    [
                      { id: 'all', label: t.bankroll.allFilter },
                      { id: 'sessions', label: t.bankroll.sessionsFilter },
                      { id: 'cashflow', label: t.bankroll.cashflowFilter },
                      { id: 'transfers', label: t.bankroll.transfersFilter },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTxFilter(f.id)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        borderRadius: '4px',
                        background:
                          txFilter === f.id ? 'var(--accent-blue-bg)' : 'var(--bg-tertiary)',
                        color: txFilter === f.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                        border:
                          txFilter === f.id
                            ? '1px solid var(--accent-blue)'
                            : '1px solid var(--border-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.txList}>
                {sortedTx.length === 0 ? (
                  <div className={styles.emptyState}>{t.bankroll.noTransactions}</div>
                ) : (
                  visibleTx.map((tx) => {
                    const accName =
                      accounts.find((a) => a.id === tx.accountId)?.name || 'Account';
                    const realAmount =
                      tx.type === 'withdrawal' ? -Math.abs(tx.amount) : tx.amount;
                    const isPositive = realAmount >= 0;
                    const isTransfer =
                      tx.type === 'transfer' ||
                      Boolean(tx.notes?.includes('→') || tx.notes?.includes('←'));

                    let txLabel = t.bankroll.sessionResultLabel;
                    if (tx.notes === 'Initial Balance') txLabel = t.bankroll.initialBalanceLabel;
                    else if (tx.notes === 'Quick sync') txLabel = t.bankroll.quickSyncAdjLabel;
                    else if (tx.type === 'deposit') txLabel = t.bankroll.depositLabel;
                    else if (tx.type === 'withdrawal') txLabel = t.bankroll.withdrawalLabel;
                    if (isTransfer) txLabel = t.bankroll.transferLabel;

                    return (
                      <div key={tx.id} className={styles.txRow}>
                        <div className={styles.txLeft}>
                          <div
                            className={cn(
                              styles.txIcon,
                              isPositive ? styles.iconGreen : styles.iconRed,
                              isTransfer ? styles.iconPurple : ''
                            )}
                          >
                            {isTransfer ? (
                              <ArrowRightLeft size={18} />
                            ) : isPositive ? (
                              <ArrowDownRight size={18} />
                            ) : (
                              <ArrowUpRight size={18} />
                            )}
                          </div>
                          <div className={styles.txInfo}>
                            <span
                              className={styles.txType}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
                            >
                              {txLabel}
                              {tx.sessionId && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    background: 'var(--accent-blue-bg)',
                                    color: 'var(--accent-blue)',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
                                  <Link2 size={10} /> {t.bankroll.autoSyncedBadge}
                                </span>
                              )}
                              {tx.transferGroupId && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    background: 'var(--accent-purple-bg)',
                                    color: 'var(--accent-purple)',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
                                  <ArrowRightLeft size={10} /> {t.bankroll.pairedTransferBadge}
                                </span>
                              )}
                            </span>
                            <span className={styles.txMeta}>
                              {formatDate(tx.date, locale)} · {accName}{' '}
                              {tx.notes &&
                              tx.notes !== 'Initial Balance' &&
                              tx.notes !== 'Quick sync'
                                ? `(${tx.notes})`
                                : ''}
                            </span>
                          </div>
                        </div>
                        <div className={styles.txRight}>
                          <span
                            className={cn(
                              styles.txAmount,
                              isPositive ? styles.cgreen : styles.cred
                            )}
                          >
                            {formatCurrency(realAmount, currency, true)}
                          </span>
                          <button
                            className={styles.deleteTxBtn}
                            disabled={reversingTxId === tx.id}
                            onClick={() => handleDeleteTx(tx.id)}
                            title={
                              tx.transferGroupId
                                ? t.bankroll.reverseTransferTooltip
                                : t.bankroll.reverseTxTooltip
                            }
                          >
                            {reversingTxId === tx.id ? (
                              <Loader2 size={14} />
                            ) : (
                              <X size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {sortedTx.length > visibleTxCount && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <button
                    className={styles.actionBtn}
                    style={{ padding: '4px 12px' }}
                    onClick={() => setVisibleTxCount((prev) => prev + 12)}
                  >
                    <span>
                      {t.bankroll.loadMore} ({sortedTx.length - visibleTxCount}{' '}
                      {t.bankroll.remaining})
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit / Withdrawal Modal */}
      {showTxModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !isSubmitting && setShowTxModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                {txForm.type === 'deposit'
                  ? t.bankroll.addDepositTitle
                  : t.bankroll.addWithdrawalTitle}
              </h3>
              <button
                className={styles.closeBtn}
                disabled={isSubmitting}
                onClick={() => setShowTxModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form className={styles.form} onSubmit={handleAddTx}>
              <div className={styles.formGroup}>
                <label>
                  {t.bankroll.amountLabel} ({currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={
                    txForm.type === 'withdrawal' && txForm.accountId
                      ? accounts.find((a) => a.id === txForm.accountId)?.balance
                      : undefined
                  }
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  placeholder="500"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t.bankroll.accountLabel} *</label>
                <select
                  value={txForm.accountId}
                  onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    {t.bankroll.selectAccount}
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balance, a.currency || currency)})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t.sessions.notes}</label>
                <input
                  type="text"
                  value={txForm.notes}
                  onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                  placeholder={t.bankroll.optionalNotes}
                />
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={isSubmitting}
                  onClick={() => setShowTxModal(false)}
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={
                    isSubmitting ||
                    !!(
                      txForm.type === 'withdrawal' &&
                      txForm.accountId &&
                      parseFloat(txForm.amount) >
                        (accounts.find((a) => a.id === txForm.accountId)?.balance || 0)
                    )
                  }
                >
                  {isSubmitting ? t.common.loading : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Account Modal */}
      {showAccModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !isSubmitting && setShowAccModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{t.bankroll.addNewAccountTitle}</h3>
              <button
                className={styles.closeBtn}
                disabled={isSubmitting}
                onClick={() => setShowAccModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form className={styles.form} onSubmit={handleAddAcc}>
              <div className={styles.formGroup}>
                <label>{t.bankroll.categoryLabel} *</label>
                <select
                  value={accForm.category}
                  onChange={(e) => {
                    const newCat = e.target.value as BankrollCategory;
                    setAccForm((prev) => ({
                      ...prev,
                      category: newCat,
                      platform: newCat === 'poker_room' ? prev.platform : 'other',
                      name: newCat === 'poker_room' ? platformLabels[prev.platform] || '' : '',
                    }));
                  }}
                  required
                >
                  <option value="poker_room">{t.bankroll.catOptionRoom}</option>
                  <option value="e_wallet">{t.bankroll.catOptionWallet}</option>
                  <option value="crypto">{t.bankroll.catOptionCrypto}</option>
                  <option value="bank_account">{t.bankroll.catOptionBank}</option>
                  <option value="cash">{t.bankroll.catOptionCash}</option>
                </select>
              </div>
              {accForm.category === 'poker_room' && (
                <div className={styles.formGroup}>
                  <label>{t.bankroll.roomPlatformLabel} *</label>
                  <select
                    value={accForm.platform}
                    onChange={(e) => {
                      const newPlat = e.target.value as Platform;
                      const prevDefaultName = platformLabels[accForm.platform] || '';
                      setAccForm((prev) => ({
                        ...prev,
                        platform: newPlat,
                        name:
                          !prev.name || prev.name === prevDefaultName
                            ? platformLabels[newPlat] || ''
                            : prev.name,
                      }));
                    }}
                    required
                  >
                    {Object.entries(platformLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.formGroup}>
                <label>{t.bankroll.displayNameLabel} *</label>
                <input
                  type="text"
                  value={accForm.name}
                  onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
                  placeholder="PokerStars IT, Skrill, Fineco"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  {t.bankroll.initialBalanceInput} ({currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={accForm.balance}
                  onChange={(e) => setAccForm({ ...accForm, balance: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={isSubmitting}
                  onClick={() => setShowAccModal(false)}
                >
                  {t.common.cancel}
                </button>
                <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
                  {isSubmitting ? t.common.loading : t.bankroll.saveAccountBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !isSubmitting && setShowTransferModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{t.bankroll.transferFundsTitle}</h3>
              <button
                className={styles.closeBtn}
                disabled={isSubmitting}
                onClick={() => setShowTransferModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form className={styles.form} onSubmit={handleTransfer}>
              <div className={styles.formGroup}>
                <label>{t.bankroll.fromLabel} *</label>
                <select
                  value={transferForm.fromId}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    const fallbackTo = accounts.find((a) => a.id !== newFrom)?.id || '';
                    setTransferForm((prev) => ({
                      ...prev,
                      fromId: newFrom,
                      toId: prev.toId === newFrom ? fallbackTo : prev.toId,
                    }));
                  }}
                  required
                >
                  <option value="" disabled>
                    {t.bankroll.selectOrigin}
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balance, a.currency || currency)})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t.bankroll.toLabel} *</label>
                <select
                  value={transferForm.toId}
                  onChange={(e) => setTransferForm({ ...transferForm, toId: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    {t.bankroll.selectDestination}
                  </option>
                  {accounts
                    .filter((a) => a.id !== transferForm.fromId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance, a.currency || currency)})
                      </option>
                    ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>
                  {t.bankroll.amountLabel} ({currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={
                    transferForm.fromId
                      ? accounts.find((a) => a.id === transferForm.fromId)?.balance
                      : undefined
                  }
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t.sessions.notes}</label>
                <input
                  type="text"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  placeholder={t.bankroll.transferNotesPlaceholder}
                />
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={isSubmitting}
                  onClick={() => setShowTransferModal(false)}
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={
                    isSubmitting ||
                    !!(
                      !transferForm.fromId ||
                      !transferForm.toId ||
                      transferForm.fromId === transferForm.toId ||
                      (transferForm.fromId &&
                        parseFloat(transferForm.amount) >
                          (accounts.find((a) => a.id === transferForm.fromId)?.balance || 0))
                    )
                  }
                >
                  {isSubmitting ? t.common.loading : t.bankroll.transfer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SyncBalancesModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
    </>
  );
}
