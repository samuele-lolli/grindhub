'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit3,
  X,
  Clock,
  TrendingUp,
  Trophy,
  ChevronDown,
  BarChart3,
  Target,
  Wallet,
  Check,
  Download,
  Loader2,
} from 'lucide-react';
import { useSessionStore, type SessionBankrollSyncItem } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useProfileStore } from '@/stores/profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { bankrollService } from '@/lib/services/bankroll-service';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { format } from 'date-fns';
import {
  formatCurrency,
  formatDate,
  formatDuration,
  getSessionProfit,
  getProfitClass,
  platformLabels,
  formatPercent,
  cn,
  dateInputToIso,
  isoToDateInput,
  downloadCsv,
} from '@/lib/utils';
import type { Session, Platform } from '@/types';
import { Tooltip } from '@/components/ui/Tooltip';
import styles from './page.module.css';

const SESSIONS_PER_PAGE = 20;

type SortMode = 'newest' | 'oldest' | 'profit_high' | 'profit_low';

interface FormState {
  date: string;
  hours: string;
  minutes: string;
  eventCount: string;
  cashesCount: string;
  totalBuyIns: string;
  totalCashes: string;
  platforms: Platform[];
  notes: string;
}

function getDefaultForm(platform: Platform): FormState {
  return {
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: '4',
    minutes: '0',
    eventCount: '',
    cashesCount: '',
    totalBuyIns: '',
    totalCashes: '',
    platforms: [platform],
    notes: '',
  };
}

export default function SessionsPage() {
  const { t, locale, formatMessage } = useI18n();
  const { toast } = useToast();
  const sessions = useSessionStore((s) => s.sessions);
  const addSession = useSessionStore((s) => s.addSession);
  const updateSession = useSessionStore((s) => s.updateSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const getStats = useSessionStore((s) => s.getStats);
  const accounts = useBankrollStore((s) => s.accounts);
  const transactions = useBankrollStore((s) => s.transactions);
  const settings = useSettingsStore((s) => s.settings);

  // ── UI State ──
  const [showModal, setShowModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [visibleCount, setVisibleCount] = useState(SESSIONS_PER_PAGE);

  // ── Form & Bankroll Sync State ──
  const [form, setForm] = useState<FormState>(() => getDefaultForm(settings.defaultPlatform));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [syncToBankroll, setSyncToBankroll] = useState<boolean>(true);
  const [platformSplits, setPlatformSplits] = useState<Record<string, string>>({});
  const [isManualSplit, setIsManualSplit] = useState<boolean>(false);

  const profile = useProfileStore((s) => s.profile);
  const setAccounts = useBankrollStore((s) => s.setAccounts);

  const sortLabels: Record<SortMode, string> = useMemo(
    () => ({
      newest: t.sessions.newestFirst,
      oldest: t.sessions.oldestFirst,
      profit_high: t.sessions.profitHigh,
      profit_low: t.sessions.profitLow,
    }),
    [t.sessions]
  );

  const getSessionDisplayName = useCallback(
    (session: Session): string => {
      return `${t.dashboard.mttSessionLabel} (${session.eventCount} MTT · ${session.cashesCount} ITM)`;
    },
    [t.dashboard.mttSessionLabel]
  );

  const getSessionSubline = useCallback((session: Session): string => {
    return `${session.platforms.map((p) => platformLabels[p] || p).join(', ')}`;
  }, []);

  const pokerRoomAccounts = useMemo(
    () => accounts.filter((a) => a.category === 'poker_room'),
    [accounts]
  );

  const findAccountForPlatform = useCallback(
    (plat: Platform) => {
      const exact = pokerRoomAccounts.find((a) => a.platform === plat);
      if (exact) return exact;
      const normPlat = plat.toLowerCase().replace(/[^a-z0-9]/g, '');
      const labelNorm = (platformLabels[plat] || plat).toLowerCase().replace(/[^a-z0-9]/g, '');
      return pokerRoomAccounts.find((a) => {
        const normName = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normName.includes(normPlat) || normName.includes(labelNorm);
      });
    },
    [pokerRoomAccounts]
  );

  const computeEvenSplits = useCallback(
    (platforms: Platform[], totalProfit: number): Record<string, string> => {
      if (platforms.length === 0) return {};
      if (platforms.length === 1) {
        return { [platforms[0]]: (Math.round(totalProfit * 100) / 100).toString() };
      }
      const perRoom = Math.round((totalProfit / platforms.length) * 100) / 100;
      const next: Record<string, string> = {};
      platforms.forEach((p, idx) => {
        if (idx === platforms.length - 1) {
          const assigned = perRoom * (platforms.length - 1);
          next[p] = (Math.round((totalProfit - assigned) * 100) / 100).toString();
        } else {
          next[p] = perRoom.toString();
        }
      });
      return next;
    },
    []
  );

  const livePreview = useMemo(() => {
    const buyIns = parseFloat(form.totalBuyIns) || 0;
    const cashes = parseFloat(form.totalCashes) || 0;
    const events = parseInt(form.eventCount) || 0;
    const itms = parseInt(form.cashesCount) || 0;
    const profit = Math.round((cashes - buyIns) * 100) / 100;
    const roi = buyIns > 0 ? (profit / buyIns) * 100 : 0;
    const abi = events > 0 ? buyIns / events : 0;
    const itm = events > 0 ? (itms / events) * 100 : 0;
    return { profit, roi, abi, itm };
  }, [form.totalBuyIns, form.totalCashes, form.eventCount, form.cashesCount]);

  useEffect(() => {
    if (!showModal || !syncToBankroll || isManualSplit) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatformSplits(computeEvenSplits(form.platforms, livePreview.profit));
  }, [showModal, syncToBankroll, isManualSplit, form.platforms, livePreview.profit, computeEvenSplits]);

  const editingSessionPreviousAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    if (!editingSessionId) return map;
    transactions
      .filter((tx) => tx.sessionId === editingSessionId)
      .forEach((tx) => {
        map[tx.accountId] = (map[tx.accountId] || 0) + tx.amount;
      });
    return map;
  }, [editingSessionId, transactions]);

  const splitSum = useMemo(() => {
    return form.platforms.reduce((sum, p) => sum + (parseFloat(platformSplits[p] ?? '0') || 0), 0);
  }, [form.platforms, platformSplits]);

  const splitDiscrepancy = useMemo(() => {
    return Math.round((livePreview.profit - splitSum) * 100) / 100;
  }, [livePreview.profit, splitSum]);

  const syncedSessionsMap = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.sessionId) {
        map.set(tx.sessionId, (map.get(tx.sessionId) || 0) + tx.amount);
      }
    });
    return map;
  }, [transactions]);

  const stats = useMemo(() => getStats(sessions), [getStats, sessions]);

  const filtered = useMemo(() => {
    let list = [...sessions];

    if (filterPlatform !== 'all') {
      list = list.filter((s) => s.platforms.includes(filterPlatform as Platform));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const name = getSessionDisplayName(s).toLowerCase();
        const plats = s.platforms
          .map((p) => platformLabels[p as Platform] || p)
          .join(' ')
          .toLowerCase();
        const notes = (s.notes || '').toLowerCase();
        return name.includes(q) || plats.includes(q) || notes.includes(q);
      });
    }

    list.sort((a, b) => {
      switch (sortMode) {
        case 'newest': {
          const d = new Date(b.date).getTime() - new Date(a.date).getTime();
          return d !== 0
            ? d
            : new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        case 'oldest': {
          const d = new Date(a.date).getTime() - new Date(b.date).getTime();
          return d !== 0
            ? d
            : new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        case 'profit_high':
          return getSessionProfit(b) - getSessionProfit(a);
        case 'profit_low':
          return getSessionProfit(a) - getSessionProfit(b);
        default:
          return 0;
      }
    });

    return list;
  }, [sessions, filterPlatform, searchQuery, sortMode, getSessionDisplayName]);

  const visibleSessions = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!form.date) errors.date = t.sessions.requiredErr;
    if (form.platforms.length === 0) errors.platforms = t.sessions.selectPlatformErr;

    const h = parseInt(form.hours || '0');
    const m = parseInt(form.minutes || '0');
    if (isNaN(h) || isNaN(m) || (h === 0 && m === 0) || h < 0 || m < 0 || m > 59) {
      errors.hours = t.sessions.invalidDurationErr;
      errors.minutes = t.sessions.invalidDurationErr;
    }

    const events = parseInt(form.eventCount);
    if (isNaN(events) || events <= 0) errors.eventCount = t.sessions.mustBePositiveErr;

    const cashes = parseInt(form.cashesCount);
    if (isNaN(cashes) || cashes < 0) errors.cashesCount = t.sessions.invalidErr;
    else if (!isNaN(events) && cashes > events) errors.cashesCount = t.sessions.exceedEventsErr;

    const buyIns = parseFloat(form.totalBuyIns);
    if (isNaN(buyIns) || buyIns < 0) errors.totalBuyIns = t.sessions.invalidErr;

    const totCashes = parseFloat(form.totalCashes);
    if (isNaN(totCashes) || totCashes < 0) errors.totalCashes = t.sessions.invalidErr;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, t.sessions]);

  const openAddModal = useCallback(() => {
    setEditingSessionId(null);
    const defaultForm = getDefaultForm(settings.defaultPlatform);
    setForm(defaultForm);
    setFormErrors({});
    setSyncToBankroll(true);
    setIsManualSplit(false);
    setPlatformSplits(computeEvenSplits(defaultForm.platforms, 0));
    setShowModal(true);
  }, [settings.defaultPlatform, computeEvenSplits]);

  const openEditModal = useCallback(
    (session: Session) => {
      setEditingSessionId(session.id);
      const hrs = Math.floor(session.duration / 60);
      const mins = session.duration % 60;
      const sessProfit = Math.round((session.totalCashes - session.totalBuyIns) * 100) / 100;
      setForm({
        date: isoToDateInput(session.date),
        hours: hrs.toString(),
        minutes: mins.toString(),
        eventCount: session.eventCount.toString(),
        cashesCount: session.cashesCount.toString(),
        totalBuyIns: session.totalBuyIns.toString(),
        totalCashes: session.totalCashes.toString(),
        platforms: session.platforms,
        notes: session.notes || '',
      });
      setFormErrors({});

      const linked = transactions.filter((tx) => tx.sessionId === session.id);
      if (linked.length > 0) {
        setSyncToBankroll(true);
        const splits: Record<string, string> = {};
        session.platforms.forEach((p) => {
          splits[p] = '0';
        });
        linked.forEach((tx) => {
          const acc = accounts.find((a) => a.id === tx.accountId);
          let matchedPlat: Platform | undefined = session.platforms.find(
            (p) => acc && findAccountForPlatform(p)?.id === acc.id
          );
          if (!matchedPlat && acc && session.platforms.includes(acc.platform)) {
            matchedPlat = acc.platform;
          }
          if (!matchedPlat && session.platforms.length > 0) {
            matchedPlat = session.platforms[0];
          }
          if (matchedPlat) {
            const prev = parseFloat(splits[matchedPlat] || '0') || 0;
            splits[matchedPlat] = (Math.round((prev + tx.amount) * 100) / 100).toString();
          }
        });
        setPlatformSplits(splits);
        setIsManualSplit(session.platforms.length > 1);
      } else {
        setSyncToBankroll(false);
        setIsManualSplit(false);
        setPlatformSplits(computeEvenSplits(session.platforms, sessProfit));
      }
      setShowModal(true);
    },
    [transactions, accounts, findAccountForPlatform, computeEvenSplits]
  );

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setShowModal(false);
    setEditingSessionId(null);
    setFormErrors({});
  }, [isSubmitting]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (showModal) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal, closeModal]);

  const splitEvenlyAcrossRooms = useCallback(() => {
    setIsManualSplit(false);
    setPlatformSplits(computeEvenSplits(form.platforms, livePreview.profit));
  }, [form.platforms, livePreview.profit, computeEvenSplits]);

  const assign100PercentToPlatform = useCallback(
    (targetPlat: Platform) => {
      setIsManualSplit(true);
      const next: Record<string, string> = {};
      form.platforms.forEach((p) => {
        next[p] =
          p === targetPlat ? (Math.round(livePreview.profit * 100) / 100).toString() : '0';
      });
      setPlatformSplits(next);
    },
    [form.platforms, livePreview.profit]
  );

  const alignDiscrepancyToLastRoom = useCallback(() => {
    if (form.platforms.length === 0) return;
    const lastPlat = form.platforms[form.platforms.length - 1];
    const currentLast = parseFloat(platformSplits[lastPlat] ?? '0') || 0;
    const adjusted = Math.round((currentLast + splitDiscrepancy) * 100) / 100;
    setPlatformSplits((prev) => ({ ...prev, [lastPlat]: adjusted.toString() }));
  }, [form.platforms, platformSplits, splitDiscrepancy]);

  // ── Submit Handler ──
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      if (!validateForm()) return;

      setIsSubmitting(true);
      try {
        const duration = parseInt(form.hours || '0') * 60 + parseInt(form.minutes || '0');

        const sessionPayload = {
          date: dateInputToIso(form.date),
          platforms: form.platforms,
          duration,
          eventCount: parseInt(form.eventCount) || 0,
          cashesCount: parseInt(form.cashesCount) || 0,
          totalBuyIns: parseFloat(form.totalBuyIns) || 0,
          totalCashes: parseFloat(form.totalCashes) || 0,
          notes: form.notes.trim(),
        };

        let bankrollSyncItems: SessionBankrollSyncItem[] | undefined = undefined;
        if (syncToBankroll && form.platforms.length > 0) {
          const items: SessionBankrollSyncItem[] = [];
          const currentAccountsList = [...useBankrollStore.getState().accounts];
          let accountsCreated = false;

          for (const plat of form.platforms) {
            const rawAmount =
              form.platforms.length === 1 && !isManualSplit
                ? livePreview.profit
                : parseFloat(platformSplits[plat] ?? '0') || 0;
            const amount = Math.round(rawAmount * 100) / 100;

            if (Math.abs(amount) <= 0.001) continue;

            let acc = findAccountForPlatform(plat);
            if (!acc && profile?.id) {
              acc = await bankrollService.createAccount(profile.id, {
                platform: plat,
                name: platformLabels[plat] || plat,
                balance: 0,
                currency: settings.currency,
                category: 'poker_room',
              });
              currentAccountsList.push(acc);
              accountsCreated = true;
            }

            if (acc) {
              items.push({ accountId: acc.id, amount });
            }
          }

          if (accountsCreated) {
            setAccounts(currentAccountsList);
          }
          bankrollSyncItems = items;
        } else if (editingSessionId && !syncToBankroll) {
          bankrollSyncItems = [];
        }

        if (editingSessionId) {
          await updateSession(editingSessionId, sessionPayload, bankrollSyncItems);
          toast.success(
            bankrollSyncItems && bankrollSyncItems.length > 0
              ? t.sessions.syncedUpdatedToast
              : t.sessions.updatedToast
          );
        } else {
          await addSession(sessionPayload, bankrollSyncItems);
          toast.success(
            bankrollSyncItems && bankrollSyncItems.length > 0
              ? t.sessions.syncedLoggedToast
              : t.sessions.loggedToast
          );
        }

        setShowModal(false);
        setEditingSessionId(null);
        setFormErrors({});
      } catch (err) {
        console.error('Session save error:', err);
        toast.error(t.sessions.errorSaveToast);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      form,
      validateForm,
      syncToBankroll,
      isManualSplit,
      livePreview.profit,
      platformSplits,
      findAccountForPlatform,
      profile,
      settings.currency,
      setAccounts,
      editingSessionId,
      updateSession,
      addSession,
      toast,
      t.sessions,
    ]
  );

  // ── Delete Handler ──
  const handleDelete = useCallback(
    async (id: string) => {
      if (deletingId) return;
      setDeletingId(id);
      try {
        await deleteSession(id);
        setDeleteConfirmId(null);
        toast.info(t.sessions.removedToast);
      } catch (err) {
        console.error('Session delete error:', err);
        toast.error(t.sessions.errorDeleteToast);
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, deleteSession, toast, t.sessions]
  );

  // ── Export CSV ──
  const handleExportCsv = useCallback(() => {
    const rows = filtered.map((s) => {
      const profit = getSessionProfit(s);
      const roi = s.totalBuyIns > 0 ? ((profit / s.totalBuyIns) * 100).toFixed(2) : '0.00';
      const abi = s.eventCount > 0 ? (s.totalBuyIns / s.eventCount).toFixed(2) : '0.00';
      return [
        isoToDateInput(s.date),
        s.platforms.map((p) => platformLabels[p] || p).join(' | '),
        s.duration,
        s.eventCount,
        s.cashesCount,
        s.totalBuyIns.toFixed(2),
        s.totalCashes.toFixed(2),
        profit.toFixed(2),
        roi,
        abi,
        s.notes || '',
      ];
    });
    downloadCsv(
      `grindhub-sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      [
        'Date',
        'Platforms',
        'Duration_Min',
        'Events_MTT',
        'Cashes_ITM',
        'Total_BuyIns',
        'Total_Cashes',
        'Net_Profit',
        'ROI_Pct',
        'Session_ABI',
        'Notes',
      ],
      rows
    );
    toast.success(t.sessions.exportedToast);
  }, [filtered, toast, t.sessions.exportedToast]);

  const avgBuyIn = stats.avgBuyIn;

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className={styles.headerLeft}>
          <h1 className="page-title">{t.sessions.title}</h1>
          <span className={styles.headerCount}>
            {sessions.length} {t.profile.sessions.toLowerCase()} · {stats.totalTournaments} MTT
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              {t.sessions.exportCsv}
            </button>
          )}
          <button className={styles.addBtn} onClick={openAddModal}>
            <Plus size={18} />
            {t.sessions.addSession}
          </button>
        </div>
      </div>

      {/* ── Summary Bar ── */}
      {sessions.length > 0 && (
        <div className={styles.summaryBar}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <BarChart3 size={18} />
            </div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryLabel} style={{ display: 'flex', alignItems: 'center' }}>
                {t.analytics.volume}
                <Tooltip content={t.tooltips.volume} position="top" />
              </span>
              <span className={styles.summaryValue}>
                {stats.totalTournaments}{' '}
                <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({stats.totalSessions}s)
                </small>
              </span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={cn(styles.summaryIcon, styles.summaryIconProfit)}>
              <TrendingUp size={18} />
            </div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryLabel} style={{ display: 'flex', alignItems: 'center' }}>
                {t.analytics.totalProfit}
                <Tooltip content={t.tooltips.totalProfit} position="top" />
              </span>
              <span className={cn(styles.summaryValue, getProfitClass(stats.totalProfit))}>
                {formatCurrency(stats.totalProfit, settings.currency, true)}
              </span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={cn(styles.summaryIcon, styles.summaryIconWin)}>
              <Trophy size={18} />
            </div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryLabel} style={{ display: 'flex', alignItems: 'center' }}>
                ROI / ITM
                <Tooltip content={t.tooltips.roi} position="top" />
              </span>
              <span className={styles.summaryValue}>
                {formatPercent(stats.roi, 1)}{' '}
                <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({stats.itm.toFixed(1)}% ITM)
                </small>
              </span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={cn(styles.summaryIcon, styles.summaryIconAvg)}>
              <Target size={18} />
            </div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryLabel} style={{ display: 'flex', alignItems: 'center' }}>
                {t.analytics.avgBuyIn}
                <Tooltip content={t.tooltips.avgBuyIn} position="top" />
              </span>
              <span className={styles.summaryValue}>
                {formatCurrency(avgBuyIn, settings.currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            placeholder={`${t.common.search}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.selectWrap}>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">{t.sessions.allPlatforms}</option>
            {Object.entries(platformLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectChevron} />
        </div>
        <div className={styles.selectWrap}>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className={styles.filterSelect}
          >
            {Object.entries(sortLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectChevron} />
        </div>
      </div>

      {/* ── Results Count ── */}
      {searchQuery || filterPlatform !== 'all' ? (
        <div className={styles.resultsInfo}>
          {formatMessage('sessions.showingOf', {
            shown: filtered.length,
            total: sessions.length,
          })}
          <button
            className={styles.clearFilters}
            onClick={() => {
              setSearchQuery('');
              setFilterPlatform('all');
            }}
          >
            {t.sessions.clearFilters}
          </button>
        </div>
      ) : null}

      {/* ── Sessions List ── */}
      <div className={styles.sessionsList}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIconWrap}>
              <Calendar size={48} />
            </div>
            <h3>{sessions.length === 0 ? t.sessions.noSessions : t.common.noResults}</h3>
            <p>{sessions.length === 0 ? t.sessions.startTracking : t.sessions.adjustFilters}</p>
            {sessions.length === 0 && (
              <button className={styles.emptyAddBtn} onClick={openAddModal}>
                <Plus size={16} />
                {t.sessions.addSession}
              </button>
            )}
          </div>
        ) : (
          visibleSessions.map((session, i) => {
            const profit = getSessionProfit(session);
            const sessionRoi = session.totalBuyIns > 0 ? (profit / session.totalBuyIns) * 100 : 0;
            const sessionAbi = session.eventCount > 0 ? session.totalBuyIns / session.eventCount : 0;
            const isDeleting = deleteConfirmId === session.id;
            const isSynced = syncedSessionsMap.has(session.id);

            return (
              <div
                key={session.id}
                className={cn(styles.sessionCard, isDeleting && styles.sessionCardDeleting)}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <div className={styles.cardLeft}>
                  <span className={styles.gameTypeBadge} data-type="mtt">
                    MTT
                  </span>
                  <div className={styles.cardInfo}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                    >
                      <span className={styles.cardName}>{getSessionDisplayName(session)}</span>
                      {isSynced && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(0, 229, 153, 0.12)',
                            color: 'var(--accent-green)',
                            border: '1px solid rgba(0, 229, 153, 0.25)',
                          }}
                          title={t.sessions.syncedTooltip}
                        >
                          <Wallet size={10} /> {t.sessions.syncedBadge}
                        </span>
                      )}
                    </div>
                    <span className={styles.cardMeta}>
                      {getSessionSubline(session)} · ABI{' '}
                      {formatCurrency(sessionAbi, settings.currency)} · ROI{' '}
                      {formatPercent(sessionRoi, 1)}
                      {session.notes ? ` · "${session.notes}"` : ''}
                    </span>
                  </div>
                </div>

                <div className={styles.cardCenter}>
                  <span className={styles.cardDate}>
                    <Calendar size={12} />
                    {formatDate(session.date, locale)}
                  </span>
                  {session.duration > 0 && (
                    <span className={styles.cardDuration}>
                      <Clock size={12} />
                      {formatDuration(session.duration)}
                    </span>
                  )}
                </div>

                <div className={styles.cardRight}>
                  <span className={cn(styles.cardProfit, getProfitClass(profit))}>
                    {formatCurrency(profit, settings.currency, true)}
                  </span>

                  {isDeleting ? (
                    <div className={styles.deleteConfirm}>
                      <button
                        className={styles.deleteYes}
                        disabled={deletingId === session.id}
                        onClick={() => handleDelete(session.id)}
                        title={t.common.confirm}
                      >
                        {deletingId === session.id ? '…' : '✓'}
                      </button>
                      <button
                        className={styles.deleteNo}
                        disabled={deletingId === session.id}
                        onClick={() => setDeleteConfirmId(null)}
                        title={t.common.cancel}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => openEditModal(session)}
                        title={t.sessions.editSession}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => setDeleteConfirmId(session.id)}
                        title={t.sessions.delete}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Show More ── */}
      {hasMore && (
        <div className={styles.showMoreWrap}>
          <button
            className={styles.showMoreBtn}
            onClick={() => setVisibleCount((prev) => prev + SESSIONS_PER_PAGE)}
          >
            {t.common.showMore}
            <span className={styles.showMoreCount}>
              ({Math.min(SESSIONS_PER_PAGE, filtered.length - visibleCount)})
            </span>
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Add / Edit Session Modal                                    */}
      {/* ════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingSessionId ? t.sessions.editSession : t.sessions.addSession}</h2>
              <button onClick={closeModal} className={styles.modalClose} disabled={isSubmitting}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Live HUD Preview Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  background: 'rgba(0, 210, 255, 0.05)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
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
                    {t.sessions.netProfit}
                  </span>
                  <span
                    className={getProfitClass(livePreview.profit)}
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px' }}
                  >
                    {formatCurrency(livePreview.profit, settings.currency, true)}
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
                    {t.sessions.sessionRoi}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '14px',
                      color:
                        livePreview.roi >= 0 ? 'var(--accent-blue-light)' : 'var(--accent-red)',
                    }}
                  >
                    {formatPercent(livePreview.roi, 1)}
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
                    {t.sessions.sessionAbi}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px' }}>
                    {formatCurrency(livePreview.abi, settings.currency)}
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
                    ITM %
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '14px',
                      color: 'var(--accent-purple-light)',
                    }}
                  >
                    {livePreview.itm.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={cn(styles.formGroup, styles.formFull)}>
                  <label>{t.sessions.sessionDate} *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className={formErrors.date ? styles.inputError : ''}
                  />
                  {formErrors.date && (
                    <span className={styles.fieldError}>{formErrors.date}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>{t.sessions.totalEventsPlayed} *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.eventCount}
                    onChange={(e) => updateField('eventCount', e.target.value)}
                    placeholder="25"
                    className={formErrors.eventCount ? styles.inputError : ''}
                  />
                  {formErrors.eventCount && (
                    <span className={styles.fieldError}>{formErrors.eventCount}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>{t.sessions.totalCashesItm} *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.cashesCount}
                    onChange={(e) => updateField('cashesCount', e.target.value)}
                    placeholder="5"
                    className={formErrors.cashesCount ? styles.inputError : ''}
                  />
                  {formErrors.cashesCount && (
                    <span className={styles.fieldError}>{formErrors.cashesCount}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>
                    {t.sessions.totalBuyInsLabel} ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.totalBuyIns}
                    onChange={(e) => updateField('totalBuyIns', e.target.value)}
                    placeholder="250"
                    className={formErrors.totalBuyIns ? styles.inputError : ''}
                  />
                  {formErrors.totalBuyIns && (
                    <span className={styles.fieldError}>{formErrors.totalBuyIns}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>
                    {t.sessions.totalCashesWonLabel} ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.totalCashes}
                    onChange={(e) => updateField('totalCashes', e.target.value)}
                    placeholder="620"
                    className={formErrors.totalCashes ? styles.inputError : ''}
                  />
                  {formErrors.totalCashes && (
                    <span className={styles.fieldError}>{formErrors.totalCashes}</span>
                  )}
                </div>

                {/* ── Platforms ── */}
                <div className={cn(styles.formGroup, styles.formFull)}>
                  <label>{t.sessions.platformsPlayed} *</label>
                  <div className={styles.platformPills}>
                    {Object.entries(platformLabels).map(([k, v]) => {
                      const isActive = form.platforms.includes(k as Platform);
                      return (
                        <button
                          key={k}
                          type="button"
                          className={cn(styles.platformPill, isActive && styles.platformPillActive)}
                          onClick={() => {
                            const newPlatforms = isActive
                              ? form.platforms.filter((p) => p !== k)
                              : [...form.platforms, k as Platform];
                            updateField('platforms', newPlatforms);
                            setIsManualSplit(false);
                            setPlatformSplits(computeEvenSplits(newPlatforms, livePreview.profit));
                          }}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                  {formErrors.platforms && (
                    <span className={styles.fieldError}>{formErrors.platforms}</span>
                  )}
                </div>

                {/* ── Integrated Bankroll Auto-Sync ── */}
                {form.platforms.length > 0 && (
                  <div
                    className={cn(styles.formGroup, styles.formFull)}
                    style={{
                      padding: '12px',
                      background: 'rgba(13, 19, 34, 0.92)',
                      border: syncToBankroll
                        ? '1px solid rgba(0, 229, 153, 0.35)'
                        : '1px solid var(--border-secondary)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Wallet
                          size={16}
                          style={{
                            color: syncToBankroll ? 'var(--accent-green)' : 'var(--text-muted)',
                          }}
                        />
                        <div>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              display: 'block',
                            }}
                          >
                            {t.sessions.syncResultToBankroll} ({form.platforms.length}{' '}
                            {form.platforms.length === 1
                              ? t.sessions.roomSingular
                              : t.sessions.roomPlural}
                            )
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {t.sessions.syncSubdesc}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSyncToBankroll(!syncToBankroll)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: syncToBankroll ? 'var(--accent-green-bg)' : 'var(--bg-tertiary)',
                          color: syncToBankroll ? 'var(--accent-green)' : 'var(--text-muted)',
                          border: syncToBankroll
                            ? '1px solid var(--accent-green)'
                            : '1px solid var(--border-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        {syncToBankroll && <Check size={14} />}
                        {syncToBankroll ? t.sessions.autoSyncOn : t.sessions.autoSyncOff}
                      </button>
                    </div>

                    {syncToBankroll && (
                      <div
                        style={{
                          marginTop: '10px',
                          paddingTop: '10px',
                          borderTop: '1px solid var(--border-secondary)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {form.platforms.length > 1 && (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {t.sessions.profitLossPerRoom} ({settings.currency}):
                            </span>
                            <button
                              type="button"
                              onClick={splitEvenlyAcrossRooms}
                              style={{
                                fontSize: '11px',
                                color: 'var(--accent-blue-light)',
                                textDecoration: 'underline',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {t.sessions.splitEvenly} (
                              {formatCurrency(
                                livePreview.profit / form.platforms.length,
                                settings.currency,
                                true
                              )}
                              )
                            </button>
                          </div>
                        )}

                        {form.platforms.map((plat) => {
                          const acc = findAccountForPlatform(plat);
                          const prevSyncedOnAcc = acc
                            ? editingSessionPreviousAmounts[acc.id] || 0
                            : 0;
                          const baseBalance = acc ? acc.balance - prevSyncedOnAcc : 0;
                          const splitVal =
                            form.platforms.length === 1 && !isManualSplit
                              ? livePreview.profit
                              : parseFloat(platformSplits[plat] ?? '0') || 0;
                          const projectedBalance = Math.round((baseBalance + splitVal) * 100) / 100;
                          const roomCurr = acc?.currency || settings.currency;

                          return (
                            <div
                              key={plat}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                padding: '6px 8px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(5, 8, 17, 0.5)',
                                border: '1px solid var(--border-secondary)',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  minWidth: 0,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    {acc ? acc.name : platformLabels[plat] || plat}
                                  </span>
                                  {!acc && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        background: 'rgba(0, 210, 255, 0.12)',
                                        color: 'var(--accent-blue)',
                                        fontFamily: 'var(--font-mono)',
                                      }}
                                    >
                                      {t.sessions.autoCreateRoom}
                                    </span>
                                  )}
                                </div>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
                                  {t.sessions.baseLabel}: {formatCurrency(baseBalance, roomCurr)}
                                  {' → '}
                                  <strong className={getProfitClass(splitVal)}>
                                    {t.sessions.newLabel}: {formatCurrency(projectedBalance, roomCurr)}
                                  </strong>
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {form.platforms.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => assign100PercentToPlatform(plat)}
                                    title={t.sessions.assign100}
                                    style={{
                                      padding: '4px 7px',
                                      fontSize: '10px',
                                      fontFamily: 'var(--font-mono)',
                                      fontWeight: 700,
                                      borderRadius: '4px',
                                      background: 'var(--bg-tertiary)',
                                      color: 'var(--text-secondary)',
                                      border: '1px solid var(--border-primary)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    100%
                                  </button>
                                )}
                                <input
                                  type="number"
                                  step="0.01"
                                  style={{
                                    width: '115px',
                                    padding: '6px 8px',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '13px',
                                    textAlign: 'right',
                                  }}
                                  value={
                                    form.platforms.length === 1 && !isManualSplit
                                      ? livePreview.profit.toString()
                                      : platformSplits[plat] ?? ''
                                  }
                                  onChange={(e) => {
                                    setIsManualSplit(true);
                                    setPlatformSplits((prev) => ({
                                      ...prev,
                                      [plat]: e.target.value,
                                    }));
                                  }}
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          );
                        })}

                        {form.platforms.length > 1 && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              paddingTop: '4px',
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            <span
                              style={{
                                color:
                                  Math.abs(splitDiscrepancy) <= 0.01
                                    ? 'var(--accent-green)'
                                    : 'var(--accent-gold)',
                              }}
                            >
                              {Math.abs(splitDiscrepancy) <= 0.01
                                ? `✓ ${t.sessions.roomSplitsMatch}: ${formatCurrency(
                                    splitSum,
                                    settings.currency,
                                    true
                                  )}`
                                : `⚠ ${formatMessage('sessions.roomSplitsMismatch', {
                                    split: formatCurrency(splitSum, settings.currency, true),
                                    profit: formatCurrency(
                                      livePreview.profit,
                                      settings.currency,
                                      true
                                    ),
                                  })}`}
                            </span>
                            {Math.abs(splitDiscrepancy) > 0.01 && (
                              <button
                                type="button"
                                onClick={alignDiscrepancyToLastRoom}
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--accent-gold)',
                                  textDecoration: 'underline',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                {t.sessions.assignRemainder} (
                                {formatCurrency(splitDiscrepancy, settings.currency, true)})
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Time & Duration ── */}
                <div className={styles.formGroup}>
                  <label>
                    {t.sessions.duration} ({t.sessions.hoursLabel})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.hours}
                    onChange={(e) => updateField('hours', e.target.value)}
                    placeholder="4"
                    className={formErrors.hours ? styles.inputError : ''}
                  />
                  {formErrors.hours && (
                    <span className={styles.fieldError}>{formErrors.hours}</span>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>{t.sessions.minutesLabel}</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={form.minutes}
                    onChange={(e) => updateField('minutes', e.target.value)}
                    placeholder="0"
                    className={formErrors.minutes ? styles.inputError : ''}
                  />
                  {formErrors.minutes && (
                    <span className={styles.fieldError}>{formErrors.minutes}</span>
                  )}
                </div>

                {/* ── Notes ── */}
                <div className={cn(styles.formGroup, styles.formFull)}>
                  <label>{t.sessions.notes}</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder={t.sessions.notesPlaceholder}
                  />
                </div>
              </div>

              {/* ── Form Actions ── */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  {t.sessions.cancel}
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={16} /> : <Plus size={16} />}
                  {isSubmitting
                    ? t.sessions.savingBtn
                    : editingSessionId
                      ? t.sessions.updateSessionBtn
                      : t.sessions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
