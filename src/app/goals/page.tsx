'use client';

import React, { useState, useMemo } from 'react';
import { Target, CheckCircle2, Trophy, Plus, Flame, Zap, Star, Award, TrendingUp, Calendar, Shield, Crown, Gem, X } from 'lucide-react';
import { useGoalsStore, ACHIEVEMENT_DEFINITIONS } from '@/stores/goals-store';
import { useSessionStore } from '@/stores/session-store';
import { useI18n } from '@/i18n';
import { formatDate, generateId } from '@/lib/utils';
import type { Goal, GoalType } from '@/types';
import styles from './page.module.css';

const goalTypeOptions: { value: GoalType; label: string; icon: React.ReactNode }[] = [
  { value: 'volume', label: 'Volume', icon: <Target size={16} /> },
  { value: 'profit', label: 'Profit', icon: <TrendingUp size={16} /> },
  { value: 'roi', label: 'ROI', icon: <Star size={16} /> },
  { value: 'custom', label: 'Custom', icon: <Zap size={16} /> },
];

/**
 * GoalsPage — Goal tracking and achievements dashboard.
 * Renders active/completed goals with progress bars, unlocked/locked achievement badges,
 * and a modal form for creating new goals.
 */
export default function GoalsPage() {
  const { t } = useI18n();
  const goals = useGoalsStore(s => s.goals);
  const achievements = useGoalsStore(s => s.achievements);
  const addGoal = useGoalsStore(s => s.addGoal);
  const deleteGoal = useGoalsStore(s => s.deleteGoal);
  const checkAchievements = useGoalsStore(s => s.checkAchievements);
  const sessions = useSessionStore(s => s.sessions);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'volume' as GoalType, targetValue: '', deadline: '' });

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => g.status === 'completed'), [goals]);

  // Check achievements on mount
  useMemo(() => { if (sessions.length > 0) checkAchievements(sessions); }, [sessions]); // eslint-disable-line

  const unlockedAchievements = useMemo(() => {
    return achievements
      .filter(a => a.unlockedAt)
      .map(a => {
        const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === a.id);
        return def ? { ...def, unlockedAt: a.unlockedAt, title: def.name } : null;
      })
      .filter(Boolean) as (typeof ACHIEVEMENT_DEFINITIONS[0] & { unlockedAt: string, title: string })[];
  }, [achievements]);
  const lockedAchievements = useMemo(() => {
    const unlockedIds = new Set(achievements.filter(a => a.unlockedAt).map(a => a.id));
    return ACHIEVEMENT_DEFINITIONS.filter(d => !unlockedIds.has(d.id));
  }, [achievements]);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const goal: Goal = {
      id: generateId(),
      title: form.title,
      description: form.description,
      type: form.type,
      targetValue: parseFloat(form.targetValue),
      currentValue: 0,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    addGoal(goal);
    setShowModal(false);
    setForm({ title: '', description: '', type: 'volume', targetValue: '', deadline: '' });
  };

  const achievementIcons: Record<string, React.ReactNode> = {
    trophy: <Trophy size={20} />, flame: <Flame size={20} />, zap: <Zap size={20} />,
    banknote: <Star size={20} />, gem: <Gem size={20} />, crown: <Crown size={20} />,
    'trending-up': <TrendingUp size={20} />, target: <Target size={20} />, shield: <Shield size={20} />,
    cpu: <Zap size={20} />, 'calendar-check': <Calendar size={20} />, 'calendar-range': <Calendar size={20} />,
    award: <Award size={20} />, medal: <Trophy size={20} />,
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{t.goals.title}</h1>
        <button className={styles.addBtn} onClick={() => setShowModal(true)}>
          <Plus size={18} /> {t.goals.createGoal}
        </button>
      </div>

      {/* Active Goals */}
      <h2 className="section-title">{t.goals.activeGoals} ({activeGoals.length})</h2>
      <div className={styles.goalsGrid}>
        {activeGoals.length === 0 ? (
          <div className={styles.empty}><Target size={48} /><h3>{t.goals.noGoals}</h3><p>{t.goals.setGoals}</p></div>
        ) : activeGoals.map((goal, i) => {
          const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);
          const today = new Date().setHours(0,0,0,0);
          const daysLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - today) / 86400000)) : null;
          return (
            <div key={goal.id} className={styles.goalCard} style={{ animationDelay: `${i * 60}ms` }}>
              <div className={styles.goalHeader}>
                <div className={styles.goalTypeIcon} data-type={goal.type}>
                  {goalTypeOptions.find(o => o.value === goal.type)?.icon || <Target size={16} />}
                </div>
                <div className={styles.goalInfo}>
                  <h3 className={styles.goalTitle}>{goal.title}</h3>
                  {goal.description && <p className={styles.goalDesc}>{goal.description}</p>}
                </div>
                <button className={styles.deleteGoalBtn} onClick={() => deleteGoal(goal.id)} title="Delete">
                  <X size={14} />
                </button>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <div className={styles.goalMeta}>
                <span className={styles.goalProgress}>{Math.round(goal.currentValue)} / {goal.targetValue}</span>
                <span className={styles.goalPercent}>{Math.round(progress)}%</span>
              </div>
              {daysLeft !== null && (
                <div className={styles.goalDeadline}>
                  <Calendar size={12} />
                  <span>{daysLeft} days remaining</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: 'var(--space-8)' }}>
            <CheckCircle2 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent-green)' }} />
            {t.goals.completedGoals} ({completedGoals.length})
          </h2>
          <div className={styles.goalsGrid}>
            {completedGoals.map((goal, i) => (
              <div key={goal.id} className={`${styles.goalCard} ${styles.completedCard}`} style={{ animationDelay: `${i * 40}ms` }}>
                <div className={styles.goalHeader}>
                  <CheckCircle2 size={20} className={styles.goalIconDone} />
                  <div className={styles.goalInfo}>
                    <h3 className={styles.goalTitle}>{goal.title}</h3>
                    {goal.completedAt && <p className={styles.goalDesc}>Completed {formatDate(goal.completedAt)}</p>}
                  </div>
                </div>
                <div className={styles.progressBar}><div className={styles.progressFillDone} style={{ width: '100%' }} /></div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Achievements - Unlocked */}
      <h2 className="section-title" style={{ marginTop: 'var(--space-8)' }}>
        <Trophy size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent-gold)' }} />
        {t.goals.achievements} ({unlockedAchievements.length}/{ACHIEVEMENT_DEFINITIONS.length})
      </h2>

      {unlockedAchievements.length > 0 && (
        <div className={styles.achievementsGrid}>
          {unlockedAchievements.map((ach, i) => (
            <div key={ach.id} className={`${styles.achCard} ${styles.achUnlocked}`} style={{ animationDelay: `${i * 40}ms` }}>
              <div className={styles.achIconWrap}>{achievementIcons[ach.icon] || <Trophy size={20} />}</div>
              <span className={styles.achTitle}>{ach.title}</span>
              <span className={styles.achDesc}>{ach.description}</span>
              {ach.unlockedAt && <span className={styles.achDate}>🏅 {formatDate(ach.unlockedAt)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <>
          <h3 className={styles.lockedTitle}>Locked ({lockedAchievements.length})</h3>
          <div className={styles.achievementsGrid}>
            {lockedAchievements.map((def, i) => (
              <div key={def.id} className={`${styles.achCard} ${styles.achLocked}`} style={{ animationDelay: `${i * 30}ms` }}>
                <div className={styles.achIconWrapLocked}>{achievementIcons[def.icon] || <Trophy size={20} />}</div>
                <span className={styles.achTitle}>{def.name}</span>
                <span className={styles.achDesc}>{def.description}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Goal Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{t.goals.createGoal}</h2>
              <button onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddGoal} className={styles.form}>
              <div className={styles.formGroup}>
                <label>{t.goals.goalTitle}</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g. Play 100 MTTs this month" />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional description..." rows={2} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>{t.goals.goalType}</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value as GoalType})}>
                    {goalTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t.goals.targetValue}</label>
                  <input type="number" step="0.1" value={form.targetValue} onChange={e => setForm({...form, targetValue: e.target.value})} required placeholder="100" />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>{t.goals.deadline}</label>
                <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn}>{t.goals.createGoal}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
