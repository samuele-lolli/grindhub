'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Search, Calendar, Trash2, X, Clock,
  TrendingUp, Trophy, ChevronDown, BarChart3, Target,
} from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useI18n } from '@/i18n';
import { format } from 'date-fns';
import {
  formatCurrency, formatDate, formatDuration, getSessionProfit, getSessionBuyIn,
  getProfitClass, platformLabels, formatPercent, cn,
} from '@/lib/utils';
import type {
  Session,
  Platform,
} from '@/types';
import { Tooltip } from '@/components/ui/Tooltip';
import styles from './page.module.css';

// ── Constants ──────────────────────────────────────────────────

const SESSIONS_PER_PAGE = 20;

type SortMode = 'newest' | 'oldest' | 'profit_high' | 'profit_low';

const sortLabels: Record<SortMode, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  profit_high: 'Highest Profit',
  profit_low: 'Lowest Profit',
};



// ── Form State Shape ───────────────────────────────────────────

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

// ── Helper: session display name ───────────────────────────────

function getSessionDisplayName(session: Session): string {
  return `MTT Session (${session.eventCount} events)`;
}

function getSessionSubline(session: Session): string {
  return `${session.platforms.map(p => platformLabels[p] || p).join(', ')}`;
}

// ════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════

/**
 * SessionsPage — CRUD interface for poker sessions.
 * Renders a filterable, sortable list of MTT sessions with a modal form for adding new entries.
 */
export default function SessionsPage() {
  const { t } = useI18n();
  const sessions = useSessionStore((s) => s.sessions);
  const addSession = useSessionStore((s) => s.addSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const getStats = useSessionStore((s) => s.getStats);
  const settings = useSettingsStore((s) => s.settings);

  // ── UI State ──
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [visibleCount, setVisibleCount] = useState(SESSIONS_PER_PAGE);

  // ── Form State ──

  const [form, setForm] = useState<FormState>(() => getDefaultForm(settings.defaultPlatform));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Computed Stats ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => getStats(), [getStats, sessions]);

  // ── Filtering & Sorting ──
  const filtered = useMemo(() => {
    let list = [...sessions];

    // Type filter removed (MTT only)

    // Platform filter
    if (filterPlatform !== 'all') {
      list = list.filter((s) => s.platforms.includes(filterPlatform as Platform));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const name = getSessionDisplayName(s).toLowerCase();
        const plats = s.platforms.map(p => platformLabels[p as Platform] || p).join(' ').toLowerCase();
        return name.includes(q) || plats.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      switch (sortMode) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'profit_high':
          return getSessionProfit(b) - getSessionProfit(a);
        case 'profit_low':
          return getSessionProfit(a) - getSessionProfit(b);
        default:
          return 0;
      }
    });

    return list;
  }, [sessions, filterPlatform, searchQuery, sortMode]);

  const visibleSessions = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // ── Form Helpers ──
  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!form.totalBuyIns || parseFloat(form.totalBuyIns) < 0) errors.totalBuyIns = 'Required';
    if (!form.totalCashes || parseFloat(form.totalCashes) < 0) errors.totalCashes = 'Required';
    if (!form.eventCount || parseInt(form.eventCount) <= 0) errors.eventCount = 'Required';
    if (!form.cashesCount || parseInt(form.cashesCount) < 0) errors.cashesCount = 'Required';
    if (!form.date) errors.date = 'Required';
    if (form.platforms.length === 0) errors.platforms = 'Required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const resetForm = useCallback(() => {
    setForm(getDefaultForm(settings.defaultPlatform));
    setFormErrors({});
  }, [settings.defaultPlatform]);

  const openModal = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setFormErrors({});
  }, []);

  // M2: Escape key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (showModal) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal, closeModal]);

  // ── Submit Handler ──
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) return;
      const duration = parseInt(form.hours || '0') * 60 + parseInt(form.minutes || '0');

      const session: Parameters<typeof addSession>[0] = {
        date: new Date(form.date).toISOString(),
        platforms: form.platforms,
        duration,
        eventCount: parseInt(form.eventCount) || 0,
        cashesCount: parseInt(form.cashesCount) || 0,
        totalBuyIns: parseFloat(form.totalBuyIns) || 0,
        totalCashes: parseFloat(form.totalCashes) || 0,
        notes: form.notes,
      };

      addSession(session);
      closeModal();
    },
    [form, addSession, closeModal, validateForm],
  );

  // ── Delete Handler ──
  const handleDelete = useCallback(
    (id: string) => {
      deleteSession(id);
      setDeleteConfirmId(null);
    },
    [deleteSession],
  );

  // ── Avg Buy-in ──
  const avgBuyIn = useMemo(() => {
    if (sessions.length === 0) return 0;
    return sessions.reduce((sum, s) => sum + getSessionBuyIn(s), 0) / sessions.length;
  }, [sessions]);

  // ════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className={styles.headerLeft}>
          <h1 className="page-title">{t.sessions.title}</h1>
          <span className={styles.headerCount}>
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>
        <button className={styles.addBtn} onClick={openModal}>
          <Plus size={18} />
          {t.sessions.addSession}
        </button>
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
                Total Sessions
                <Tooltip content={t.tooltips?.volume || 'Total number of sessions played.'} position="top" />
              </span>
              <span className={styles.summaryValue}>{stats.totalSessions}</span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={cn(styles.summaryIcon, styles.summaryIconProfit)}>
              <TrendingUp size={18} />
            </div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryLabel} style={{ display: 'flex', alignItems: 'center' }}>
                Total Profit
                <Tooltip content={t.tooltips?.totalProfit || 'Net profit minus all buy-ins and fees.'} position="top" />
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
                Win Rate
                <Tooltip content={t.tooltips?.winRate || 'Percentage of sessions ended in profit.'} position="top" />
              </span>
              <span className={styles.summaryValue}>
                {formatPercent(stats.winRate, 1).replace('+', '')}
              </span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={cn(styles.summaryIcon, styles.summaryIconAvg)}>
              <Target size={18} />
            </div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryLabel} style={{ display: 'flex', alignItems: 'center' }}>
                Avg Buy-in
                <Tooltip content={t.tooltips?.avgBuyIn || 'Average cost to enter a session.'} position="top" />
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
              <option key={k} value={k}>{v}</option>
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
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectChevron} />
        </div>
      </div>

      {/* ── Results Count ── */}
      {searchQuery || filterPlatform !== 'all' ? (
        <div className={styles.resultsInfo}>
          Showing {filtered.length} of {sessions.length} sessions
          {(searchQuery || filterPlatform !== 'all') && (
            <button
              className={styles.clearFilters}
              onClick={() => {
                setSearchQuery('');
                setFilterPlatform('all');
              }}
            >
              Clear filters
            </button>
          )}
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
            <p>
              {sessions.length === 0
                ? t.sessions.startTracking
                : 'Try adjusting your filters or search query'}
            </p>
            {sessions.length === 0 && (
              <button className={styles.emptyAddBtn} onClick={openModal}>
                <Plus size={16} />
                {t.sessions.addSession}
              </button>
            )}
          </div>
        ) : (
          visibleSessions.map((session, i) => {
            const profit = getSessionProfit(session);
            const isDeleting = deleteConfirmId === session.id;

            return (
              <div
                key={session.id}
                className={cn(styles.sessionCard, isDeleting && styles.sessionCardDeleting)}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <div className={styles.cardLeft}>
                  <span
                    className={styles.gameTypeBadge}
                    data-type="mtt"
                  >
                    MTT
                  </span>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardName}>
                      {getSessionDisplayName(session)}
                    </span>
                    <span className={styles.cardMeta}>
                      {getSessionSubline(session)}
                    </span>
                  </div>
                </div>

                <div className={styles.cardCenter}>
                  <span className={styles.cardDate}>
                    <Calendar size={12} />
                    {formatDate(session.date)}
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
                        onClick={() => handleDelete(session.id)}
                        title="Confirm delete"
                      >
                        ✓
                      </button>
                      <button
                        className={styles.deleteNo}
                        onClick={() => setDeleteConfirmId(null)}
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setDeleteConfirmId(session.id)}
                      title={t.sessions.delete}
                    >
                      <Trash2 size={14} />
                    </button>
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
              ({Math.min(SESSIONS_PER_PAGE, filtered.length - visibleCount)} more)
            </span>
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Add Session Modal                                          */}
      {/* ════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2>{t.sessions.addSession}</h2>
              <button onClick={closeModal} className={styles.modalClose}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                {/* ── Aggregated MTT Fields ── */}
                <div className={cn(styles.formGroup, styles.formFull)}>
                  <label>Session Date *</label>
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
                  <label>Total Events Played *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.eventCount}
                    onChange={(e) => updateField('eventCount', e.target.value)}
                    placeholder="e.g. 15"
                    className={formErrors.eventCount ? styles.inputError : ''}
                  />
                  {formErrors.eventCount && (
                    <span className={styles.fieldError}>{formErrors.eventCount}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Total Cashes (ITMs) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.cashesCount}
                    onChange={(e) => updateField('cashesCount', e.target.value)}
                    placeholder="e.g. 3"
                    className={formErrors.cashesCount ? styles.inputError : ''}
                  />
                  {formErrors.cashesCount && (
                    <span className={styles.fieldError}>{formErrors.cashesCount}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Total Spent (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.totalBuyIns}
                    onChange={(e) => updateField('totalBuyIns', e.target.value)}
                    placeholder="e.g. 150"
                    className={formErrors.totalBuyIns ? styles.inputError : ''}
                  />
                  {formErrors.totalBuyIns && (
                    <span className={styles.fieldError}>{formErrors.totalBuyIns}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Total Won (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.totalCashes}
                    onChange={(e) => updateField('totalCashes', e.target.value)}
                    placeholder="e.g. 450"
                    className={formErrors.totalCashes ? styles.inputError : ''}
                  />
                  {formErrors.totalCashes && (
                    <span className={styles.fieldError}>{formErrors.totalCashes}</span>
                  )}
                </div>

                {/* ── Platforms ── */}
                <div className={cn(styles.formGroup, styles.formFull)}>
                  <label>Platforms Played *</label>
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
                              ? form.platforms.filter(p => p !== k)
                              : [...form.platforms, k as Platform];
                            updateField('platforms', newPlatforms);
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

                {/* ── Time & Duration ── */}
                <div className={styles.formGroup}>
                  <label>{t.sessions.duration} (Hours)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.hours}
                    onChange={(e) => updateField('hours', e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={form.minutes}
                    onChange={(e) => updateField('minutes', e.target.value)}
                    placeholder="30"
                  />
                </div>

                {/* ── Notes ── */}
                <div className={cn(styles.formGroup, styles.formFull)}>
                  <label>{t.sessions.notes}</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Any notes about this session..."
                  />
                </div>
              </div>

              {/* ── Form Actions ── */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={closeModal}
                >
                  {t.sessions.cancel}
                </button>
                <button type="submit" className={styles.submitBtn}>
                  <Plus size={16} />
                  {t.sessions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
