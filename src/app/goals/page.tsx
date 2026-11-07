'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Target,
  CheckCircle2,
  Trophy,
  Plus,
  Flame,
  Zap,
  Star,
  Award,
  TrendingUp,
  Calendar,
  Shield,
  Crown,
  Gem,
  X,
  Lock,
  Clock,
  Minus,
  Wallet,
  Edit3,
  Pause,
  Play,
  AlertCircle,
} from 'lucide-react';
import { useGoalsStore, ACHIEVEMENT_DEFINITIONS } from '@/stores/goals-store';
import { useSessionStore } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useSettingsStore } from '@/stores/settings-store';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { formatDate, formatCurrency, dateInputToIso, isoToDateInput } from '@/lib/utils';
import type { Goal, GoalType } from '@/types';
import styles from './page.module.css';

const GOAL_TEMPLATES = [
  {
    id: 't1',
    title: 'Grinder: 100 MTT',
    description: 'Play 100 multi-table tournaments this month',
    type: 'volume' as GoalType,
    targetValue: 100,
    icon: <Target size={20} />,
  },
  {
    id: 't2',
    title: 'Volume Beast: 500 MTT',
    description: 'High-volume monthly tournament target',
    type: 'volume' as GoalType,
    targetValue: 500,
    icon: <Flame size={20} />,
  },
  {
    id: 't3',
    title: 'Milestone: +500 Profit',
    description: 'Reach +500 net tournament profit in period',
    type: 'profit' as GoalType,
    targetValue: 500,
    icon: <TrendingUp size={20} />,
  },
  {
    id: 't4',
    title: 'Crusher: +2,000 Profit',
    description: 'Hit the +2,000 net profit milestone',
    type: 'profit' as GoalType,
    targetValue: 2000,
    icon: <Gem size={20} />,
  },
  {
    id: 't8',
    title: 'Roll Builder: 5,000 Bankroll',
    description: 'Grow your playable poker bankroll to 5,000',
    type: 'bankroll' as GoalType,
    targetValue: 5000,
    icon: <Wallet size={20} />,
  },
  {
    id: 't5',
    title: 'Solid ROI: 20%',
    description: 'Maintain ≥20% ROI over at least 10 MTTs',
    type: 'roi' as GoalType,
    targetValue: 20,
    icon: <Star size={20} />,
  },
  {
    id: 't6',
    title: 'Elite ROI: 35%',
    description: 'Sustain ≥35% ROI over at least 10 MTTs',
    type: 'roi' as GoalType,
    targetValue: 35,
    icon: <Crown size={20} />,
  },
  {
    id: 't7',
    title: 'Table Time: 50h',
    description: 'Put in 50 hours of focused table grind',
    type: 'time' as GoalType,
    targetValue: 50,
    icon: <Clock size={20} />,
  },
];

export default function GoalsPage() {
  const { t, locale, formatMessage } = useI18n();
  const { toast } = useToast();
  const goals = useGoalsStore((s) => s.goals);
  const achievements = useGoalsStore((s) => s.achievements);
  const addGoal = useGoalsStore((s) => s.addGoal);
  const updateGoal = useGoalsStore((s) => s.updateGoal);
  const deleteGoal = useGoalsStore((s) => s.deleteGoal);
  const updateProgress = useGoalsStore((s) => s.updateProgress);
  const checkAchievements = useGoalsStore((s) => s.checkAchievements);
  const evaluateActiveGoals = useGoalsStore((s) => s.evaluateActiveGoals);

  const sessions = useSessionStore((s) => s.sessions);
  const getStats = useSessionStore((s) => s.getStats);
  const accounts = useBankrollStore((s) => s.accounts);
  const settings = useSettingsStore((s) => s.settings);
  const currency = settings?.currency || 'EUR';

  const stats = useMemo(() => getStats(sessions), [getStats, sessions]);
  const playableBankroll = useMemo(
    () => accounts.filter((a) => a.category === 'poker_room').reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  const [showModal, setShowModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'volume' as GoalType,
    targetValue: '',
    deadline: '',
  });

  const goalTypeOptions: { value: GoalType; label: string; icon: React.ReactNode }[] = useMemo(
    () => [
      { value: 'volume', label: t.goals.volume, icon: <Target size={20} /> },
      { value: 'profit', label: t.goals.profit, icon: <TrendingUp size={20} /> },
      { value: 'bankroll', label: t.goals.bankroll, icon: <Wallet size={20} /> },
      { value: 'roi', label: t.goals.roi, icon: <Star size={20} /> },
      { value: 'time', label: t.goals.time, icon: <Clock size={20} /> },
      { value: 'custom', label: t.goals.custom, icon: <Zap size={20} /> },
    ],
    [t.goals]
  );

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const pausedGoals = useMemo(() => goals.filter((g) => g.status === 'paused'), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'completed'), [goals]);
  const failedGoals = useMemo(() => goals.filter((g) => g.status === 'failed'), [goals]);

  useEffect(() => {
    checkAchievements(stats, playableBankroll);
    evaluateActiveGoals(sessions).catch(console.error);
  }, [sessions.length, playableBankroll]); // eslint-disable-line react-hooks/exhaustive-deps

  const unlockedAchievements = useMemo(() => {
    return achievements
      .filter((a) => a.unlockedAt)
      .map((a) => {
        const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === a.id);
        return def ? { ...def, unlockedAt: a.unlockedAt, title: def.name } : null;
      })
      .filter(Boolean) as ((typeof ACHIEVEMENT_DEFINITIONS)[0] & {
      unlockedAt: string;
      title: string;
    })[];
  }, [achievements]);

  const lockedAchievements = useMemo(() => {
    const unlockedIds = new Set(achievements.filter((a) => a.unlockedAt).map((a) => a.id));
    return ACHIEVEMENT_DEFINITIONS.filter((d) => !unlockedIds.has(d.id));
  }, [achievements]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setShowModal(false);
        setEditingGoalId(null);
      }
    };
    if (showModal) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal, isSubmitting]);

  const openCreateModal = () => {
    setEditingGoalId(null);
    setForm({ title: '', description: '', type: 'volume', targetValue: '', deadline: '' });
    setShowModal(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setForm({
      title: goal.title,
      description: goal.description || '',
      type: goal.type,
      targetValue: goal.targetValue.toString(),
      deadline: goal.deadline ? isoToDateInput(goal.deadline) : '',
    });
    setShowModal(true);
  };

  const handleSaveGoal = useCallback(async (
    e?: React.FormEvent,
    template?: (typeof GOAL_TEMPLATES)[0]
  ) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (template) {
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString();
        await addGoal({
          title: template.title,
          description: template.description,
          type: template.type,
          targetValue: template.targetValue,
          currentValue: 0,
          deadline: thirtyDaysFromNow,
          status: 'active',
        });
        toast.success(t.goals.goalSavedToast);
      } else {
        const parsedTarget = parseFloat(form.targetValue);
        if (isNaN(parsedTarget) || parsedTarget <= 0) {
          toast.error(t.goals.targetPositiveErr);
          setIsSubmitting(false);
          return;
        }

        const deadlineIso = form.deadline
          ? dateInputToIso(form.deadline)
          : new Date(Date.now() + 30 * 86400000).toISOString();

        if (editingGoalId) {
          await updateGoal(editingGoalId, {
            title: form.title.trim(),
            description: form.description.trim(),
            type: form.type,
            targetValue: parsedTarget,
            deadline: deadlineIso,
          });
          toast.success(t.goals.goalUpdatedToast);
        } else {
          await addGoal({
            title: form.title.trim(),
            description: form.description.trim(),
            type: form.type,
            targetValue: parsedTarget,
            currentValue: 0,
            deadline: deadlineIso,
            status: 'active',
          });
          toast.success(t.goals.goalSavedToast);
        }
      }

      setShowModal(false);
      setEditingGoalId(null);
      setForm({ title: '', description: '', type: 'volume', targetValue: '', deadline: '' });
    } catch {
      toast.error(t.common.error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, addGoal, updateGoal, form, editingGoalId, toast, t.goals, t.common.error]);

  const handleTogglePause = async (goal: Goal) => {
    try {
      const nextStatus = goal.status === 'paused' ? 'active' : 'paused';
      await updateGoal(goal.id, { status: nextStatus });
      toast.info(t.goals.goalUpdatedToast);
    } catch {
      toast.error(t.common.error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoal(id);
      toast.info(t.goals.goalDeletedToast);
    } catch {
      toast.error(t.common.error);
    }
  };

  const achievementIcons: Record<string, React.ReactNode> = {
    Trophy: <Trophy size={24} />,
    Flame: <Flame size={24} />,
    Zap: <Zap size={24} />,
    Target: <Target size={24} />,
    Award: <Award size={24} />,
    Crown: <Crown size={24} />,
    Gem: <Gem size={24} />,
    Shield: <Shield size={24} />,
  };

  const renderGoalProgressText = (goal: Goal) => {
    if (goal.type === 'time') return `${goal.currentValue.toFixed(1)} / ${goal.targetValue} h`;
    if (goal.type === 'profit' || goal.type === 'bankroll') {
      return `${formatCurrency(goal.currentValue, currency)} / ${formatCurrency(
        goal.targetValue,
        currency
      )}`;
    }
    if (goal.type === 'roi') return `${goal.currentValue.toFixed(1)}% / ${goal.targetValue}%`;
    return `${Math.round(goal.currentValue)} / ${goal.targetValue}`;
  };

  const renderGoalCard = (goal: Goal, i: number) => {
    const progress = Math.min(100, Math.max(0, (goal.currentValue / goal.targetValue) * 100));
    const todayMidnight = new Date().setHours(0, 0, 0, 0);
    const daysLeft = goal.deadline
      ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - todayMidnight) / 86400000))
      : null;

    return (
      <div
        key={goal.id}
        className={styles.goalCard}
        style={{
          animationDelay: `${i * 50}ms`,
          opacity: goal.status === 'paused' ? 0.75 : 1,
        }}
      >
        <div className={styles.goalHeader}>
          <div className={styles.goalTypeIcon} data-type={goal.type}>
            {goalTypeOptions.find((o) => o.value === goal.type)?.icon || <Target size={20} />}
          </div>
          <div className={styles.goalInfo}>
            <h3 className={styles.goalTitle}>{goal.title}</h3>
            {goal.description && <p className={styles.goalDesc}>{goal.description}</p>}
            {goal.type === 'roi' && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {t.goals.roiSampleNote}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className={styles.deleteGoalBtn}
              onClick={() => handleTogglePause(goal)}
              title={goal.status === 'paused' ? t.goals.resumeBtn : t.goals.pauseBtn}
            >
              {goal.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              type="button"
              className={styles.deleteGoalBtn}
              onClick={() => openEditModal(goal)}
              title={t.goals.editGoal}
            >
              <Edit3 size={14} />
            </button>
            <button
              type="button"
              className={styles.deleteGoalBtn}
              onClick={() => handleDeleteGoal(goal.id)}
              title={t.common.delete}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <span className={styles.goalProgress}>{renderGoalProgressText(goal)}</span>
            <span className={styles.goalPercent}>{Math.round(progress)}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {goal.type === 'custom' && goal.status === 'active' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {t.goals.logProgress}
            </span>
            <button
              type="button"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#fff',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => updateProgress(goal.id, Math.max(0, goal.currentValue - 1))}
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#fff',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => updateProgress(goal.id, goal.currentValue + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        )}

        {daysLeft !== null && (
          <div className={styles.goalFooter}>
            <div className={styles.goalDeadline}>
              <Calendar size={14} />
              <span>
                {daysLeft === 0
                  ? t.goals.dueToday
                  : formatMessage('goals.daysRemaining', { days: daysLeft })}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.pageContainer}>
      <div className="page-header">
        <h1 className="page-title">{t.goals.title}</h1>
        <button className={styles.addBtn} onClick={openCreateModal}>
          <Plus size={18} /> {t.goals.createGoal}
        </button>
      </div>

      {/* Active Goals */}
      <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center' }}>
        {t.goals.activeGoals} ({activeGoals.length})
        <UITooltip content={t.tooltips.activeGoals} position="right" />
      </h2>
      <div className={styles.goalsGrid}>
        {activeGoals.length === 0 ? (
          <div className={styles.empty}>
            <Target size={48} style={{ color: 'var(--accent-blue)' }} />
            <h3>{t.goals.noGoals}</h3>
            <p>{t.goals.setGoals}</p>
          </div>
        ) : (
          activeGoals.map((goal, i) => renderGoalCard(goal, i))
        )}
      </div>

      {/* Paused Goals */}
      {pausedGoals.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <Pause size={22} style={{ color: 'var(--accent-gold)' }} />
            <h2 className={styles.sectionTitle}>
              {t.goals.pausedGoals} ({pausedGoals.length})
            </h2>
          </div>
          <div className={styles.goalsGrid}>
            {pausedGoals.map((goal, i) => renderGoalCard(goal, i))}
          </div>
        </>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <CheckCircle2 size={24} style={{ color: 'var(--accent-green)' }} />
            <h2 className={styles.sectionTitle}>
              {t.goals.completedGoals} ({completedGoals.length})
            </h2>
          </div>
          <div className={styles.goalsGrid}>
            {completedGoals.map((goal, i) => (
              <div
                key={goal.id}
                className={`${styles.goalCard} ${styles.completedCard}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className={styles.goalHeader}>
                  <CheckCircle2 size={24} className={styles.goalIconDone} />
                  <div className={styles.goalInfo}>
                    <h3 className={styles.goalTitle}>{goal.title}</h3>
                    <p className={styles.goalDesc}>
                      {renderGoalProgressText(goal)}
                      {goal.completedAt
                        ? ` · ${t.goals.completedOn} ${formatDate(goal.completedAt, locale)}`
                        : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.deleteGoalBtn}
                    onClick={() => handleDeleteGoal(goal.id)}
                    title={t.common.delete}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className={styles.progressContainer}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFillDone} style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Expired / Failed Goals */}
      {failedGoals.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <AlertCircle size={22} style={{ color: 'var(--accent-red)' }} />
            <h2 className={styles.sectionTitle}>
              {t.goals.failedGoals} ({failedGoals.length})
            </h2>
          </div>
          <div className={styles.goalsGrid}>
            {failedGoals.map((goal, i) => (
              <div
                key={goal.id}
                className={styles.goalCard}
                style={{
                  animationDelay: `${i * 40}ms`,
                  borderColor: 'rgba(255, 59, 92, 0.35)',
                }}
              >
                <div className={styles.goalHeader}>
                  <AlertCircle size={22} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
                  <div className={styles.goalInfo}>
                    <h3 className={styles.goalTitle}>{goal.title}</h3>
                    <p className={styles.goalDesc}>
                      {renderGoalProgressText(goal)}
                      {goal.deadline
                        ? ` · ${t.goals.expiredOn} ${formatDate(goal.deadline, locale)}`
                        : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className={styles.deleteGoalBtn}
                      onClick={() => openEditModal(goal)}
                      title={t.goals.editGoal}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.deleteGoalBtn}
                      onClick={() => handleDeleteGoal(goal.id)}
                      title={t.common.delete}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Unlocked Achievements */}
      <div className={styles.sectionHeader}>
        <Trophy size={24} style={{ color: 'var(--accent-gold)' }} />
        <h2 className={styles.sectionTitle}>
          {t.goals.achievements} ({unlockedAchievements.length}/{ACHIEVEMENT_DEFINITIONS.length})
        </h2>
      </div>

      {unlockedAchievements.length > 0 && (
        <div className={styles.achievementsGrid}>
          {unlockedAchievements.map((ach, i) => (
            <div
              key={ach.id}
              className={`${styles.achCard} ${styles.achUnlocked}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className={styles.achIconWrap}>
                {achievementIcons[ach.icon] || <Trophy size={24} />}
              </div>
              <span className={styles.achTitle}>{ach.title}</span>
              <span className={styles.achDesc}>{ach.description}</span>
              {ach.unlockedAt && (
                <span className={styles.achDate}>🏅 {formatDate(ach.unlockedAt, locale)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <>
          <h3
            className={styles.sectionTitle}
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {t.goals.inProgressAchievements} ({lockedAchievements.length})
          </h3>
          <div className={styles.achievementsGrid}>
            {lockedAchievements.map((def, i) => {
              const rawCurrent = Math.max(0, def.getValue(stats, playableBankroll));
              const pct = Math.min(100, Math.round((rawCurrent / def.target) * 100));
              const isCurrencyUnit = def.unit === 'profit' || def.unit === '€';
              const displayCurrent = isCurrencyUnit
                ? formatCurrency(rawCurrent, currency)
                : def.unit === 'hrs'
                  ? `${rawCurrent.toFixed(1)}`
                  : `${Math.floor(rawCurrent)}`;
              const displayTarget = isCurrencyUnit
                ? formatCurrency(def.target, currency)
                : `${def.target} ${def.unit}`;

              return (
                <div
                  key={def.id}
                  className={`${styles.achCard} ${styles.achLocked}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className={styles.achIconWrapLocked}>
                    {achievementIcons[def.icon] || <Lock size={20} />}
                  </div>
                  <span className={styles.achTitle}>{def.name}</span>
                  <span className={styles.achDesc}>{def.description}</span>
                  <div style={{ width: '100%', marginTop: 'auto', paddingTop: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                      }}
                    >
                      <span>
                        {displayCurrent} / {displayTarget}
                      </span>
                      <span style={{ color: 'var(--accent-blue)' }}>{pct}%</span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '5px',
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'var(--gradient-primary)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / Edit Goal Modal */}
      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (!isSubmitting) {
              setShowModal(false);
              setEditingGoalId(null);
            }
          }}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingGoalId ? t.goals.editGoal : t.goals.createGoal}</h2>
              <button
                disabled={isSubmitting}
                onClick={() => {
                  setShowModal(false);
                  setEditingGoalId(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalContent}>
              {!editingGoalId && (
                <>
                  <div className={styles.templatesSection}>
                    <span className={styles.templatesTitle}>
                      <Zap size={16} /> {t.goals.templatesTitle}
                    </span>
                    <div className={styles.templatesGrid}>
                      {GOAL_TEMPLATES.map((template) => (
                        <div
                          key={template.id}
                          className={styles.templateCard}
                          onClick={() => handleSaveGoal(undefined, template)}
                        >
                          <div className={styles.templateIcon}>{template.icon}</div>
                          <div className={styles.templateInfo}>
                            <span className={styles.templateTitle}>{template.title}</span>
                            <span className={styles.templateDesc}>{template.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formDivider}>{t.goals.orCustomGoal}</div>
                </>
              )}

              <form id="goalForm" onSubmit={handleSaveGoal} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>{t.goals.goalTitle}</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder="Play 200 MTTs this month"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t.goals.descriptionLabel}</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t.goals.optionalDescPlaceholder}
                    rows={2}
                  />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>{t.goals.goalType}</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as GoalType })}
                    >
                      {goalTypeOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>{t.goals.targetValue}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={form.targetValue}
                      onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                      required
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t.goals.deadline}</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  />
                </div>
              </form>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                disabled={isSubmitting}
                onClick={() => {
                  setShowModal(false);
                  setEditingGoalId(null);
                }}
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                form="goalForm"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t.common.loading
                  : editingGoalId
                    ? t.goals.updateGoalBtn
                    : t.goals.createGoal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
