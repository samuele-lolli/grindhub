'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Target, CheckCircle2, Trophy, Plus, Flame, Zap, Star, Award, TrendingUp, Calendar, Shield, Crown, Gem, X, Lock } from 'lucide-react';
import { useGoalsStore, ACHIEVEMENT_DEFINITIONS } from '@/stores/goals-store';
import { useSessionStore } from '@/stores/session-store';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';
import { useI18n } from '@/i18n';
import { formatDate } from '@/lib/utils';
import type { GoalType } from '@/types';
import styles from './page.module.css';

const goalTypeOptions: { value: GoalType; label: string; icon: React.ReactNode }[] = [
  { value: 'volume', label: 'Volume', icon: <Target size={20} /> },
  { value: 'profit', label: 'Profit', icon: <TrendingUp size={20} /> },
  { value: 'roi', label: 'ROI', icon: <Star size={20} /> },
  { value: 'custom', label: 'Custom', icon: <Zap size={20} /> },
];

const GOAL_TEMPLATES = [
  { id: 't1', title: 'Grinder: 100 MTTs', description: 'Play 100 Tournaments this month', type: 'volume' as GoalType, targetValue: 100, icon: <Target size={20} /> },
  { id: 't2', title: 'Volume Beast: 500 MTTs', description: 'Massive volume goal', type: 'volume' as GoalType, targetValue: 500, icon: <Flame size={20} /> },
  { id: 't3', title: 'First Milestone: €500', description: 'Reach €500 total profit', type: 'profit' as GoalType, targetValue: 500, icon: <TrendingUp size={20} /> },
  { id: 't4', title: 'Baller: €2k Profit', description: 'Hit the 2k profit milestone', type: 'profit' as GoalType, targetValue: 2000, icon: <Gem size={20} /> },
  { id: 't5', title: 'Solid ROI: 20%', description: 'Achieve a 20% ROI', type: 'roi' as GoalType, targetValue: 20, icon: <Star size={20} /> },
  { id: 't6', title: 'Crusher ROI: 50%', description: 'Sustain a 50% ROI', type: 'roi' as GoalType, targetValue: 50, icon: <Crown size={20} /> },
];

export default function GoalsPage() {
  const { t } = useI18n();
  const goals = useGoalsStore(s => s.goals);
  const achievements = useGoalsStore(s => s.achievements);
  const addGoal = useGoalsStore(s => s.addGoal);
  const deleteGoal = useGoalsStore(s => s.deleteGoal);
  const checkAchievements = useGoalsStore(s => s.checkAchievements);
  const sessions = useSessionStore(s => s.sessions);
  const getStats = useSessionStore(s => s.getStats);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'volume' as GoalType, targetValue: '', deadline: '' });

  const activeGoals = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => g.status === 'completed'), [goals]);

  // Check achievements on mount/session change
  useEffect(() => { if (sessions.length > 0) checkAchievements(getStats()); }, [sessions.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // M2: Escape key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    if (showModal) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  const handleAddGoal = async (e?: React.FormEvent, template?: typeof GOAL_TEMPLATES[0]) => {
    if (e) e.preventDefault();
    
    const now = new Date().getTime();
    let goalData;
    if (template) {
      goalData = {
        title: template.title,
        description: template.description,
        type: template.type,
        targetValue: template.targetValue,
        currentValue: 0,
        deadline: new Date(now + 30 * 86400000).toISOString(),
        status: 'active' as const,
      };
    } else {
      goalData = {
        title: form.title,
        description: form.description,
        type: form.type,
        targetValue: parseFloat(form.targetValue),
        currentValue: 0,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : new Date(now + 30 * 86400000).toISOString(),
        status: 'active' as const,
      };
    }

    await addGoal(goalData);
    setShowModal(false);
    setForm({ title: '', description: '', type: 'volume', targetValue: '', deadline: '' });
  };

  const applyTemplate = (template: typeof GOAL_TEMPLATES[0]) => {
    handleAddGoal(undefined, template);
  };

  const achievementIcons: Record<string, React.ReactNode> = {
    trophy: <Trophy size={24} />, flame: <Flame size={24} />, zap: <Zap size={24} />,
    banknote: <Star size={24} />, gem: <Gem size={24} />, crown: <Crown size={24} />,
    'trending-up': <TrendingUp size={24} />, target: <Target size={24} />, shield: <Shield size={24} />,
    cpu: <Zap size={24} />, 'calendar-check': <Calendar size={24} />, 'calendar-range': <Calendar size={24} />,
    award: <Award size={24} />, medal: <Trophy size={24} />,
  };

  return (
    <div className={styles.pageContainer}>
      <div className="page-header">
        <h1 className="page-title">{t.goals.title}</h1>
        <button className={styles.addBtn} onClick={() => setShowModal(true)}>
          <Plus size={18} /> {t.goals.createGoal}
        </button>
      </div>

      {/* Active Goals */}
      <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center' }}>
        {t.goals.activeGoals} ({activeGoals.length})
        <UITooltip content={t.tooltips?.activeGoals || 'Goals automatically progress as you log new sessions.'} position="right" />
      </h2>
      <div className={styles.goalsGrid}>
        {activeGoals.length === 0 ? (
          <div className={styles.empty}>
            <Target size={48} style={{ color: 'var(--accent-blue)' }} />
            <h3>{t.goals.noGoals}</h3>
            <p>{t.goals.setGoals}</p>
          </div>
        ) : activeGoals.map((goal, i) => {
          const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);
          const today = new Date().setHours(0,0,0,0);
          const daysLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - today) / 86400000)) : null;
          return (
            <div key={goal.id} className={styles.goalCard} style={{ animationDelay: `${i * 60}ms` }}>
              <div className={styles.goalHeader}>
                <div className={styles.goalTypeIcon} data-type={goal.type}>
                  {goalTypeOptions.find(o => o.value === goal.type)?.icon || <Target size={20} />}
                </div>
                <div className={styles.goalInfo}>
                  <h3 className={styles.goalTitle}>{goal.title}</h3>
                  {goal.description && <p className={styles.goalDesc}>{goal.description}</p>}
                </div>
                <button className={styles.deleteGoalBtn} onClick={() => deleteGoal(goal.id)} title="Delete Goal">
                  <X size={16} />
                </button>
              </div>
              
              <div className={styles.progressContainer}>
                <div className={styles.progressHeader}>
                  <span className={styles.goalProgress}>{Math.round(goal.currentValue)} / {goal.targetValue}</span>
                  <span className={styles.goalPercent}>{Math.round(progress)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
              </div>
              
              {daysLeft !== null && (
                <div className={styles.goalFooter}>
                  <div className={styles.goalDeadline}>
                    <Calendar size={14} />
                    <span>{daysLeft} days remaining</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <CheckCircle2 size={24} style={{ color: 'var(--accent-green)' }} />
            <h2 className={styles.sectionTitle}>{t.goals.completedGoals} ({completedGoals.length})</h2>
          </div>
          <div className={styles.goalsGrid}>
            {completedGoals.map((goal, i) => (
              <div key={goal.id} className={`${styles.goalCard} ${styles.completedCard}`} style={{ animationDelay: `${i * 40}ms` }}>
                <div className={styles.goalHeader}>
                  <CheckCircle2 size={24} className={styles.goalIconDone} />
                  <div className={styles.goalInfo}>
                    <h3 className={styles.goalTitle}>{goal.title}</h3>
                    {goal.completedAt && <p className={styles.goalDesc}>Completed {formatDate(goal.completedAt)}</p>}
                  </div>
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

      {/* Achievements - Unlocked */}
      <div className={styles.sectionHeader}>
        <Trophy size={24} style={{ color: 'var(--accent-gold)' }} />
        <h2 className={styles.sectionTitle}>{t.goals.achievements} ({unlockedAchievements.length}/{ACHIEVEMENT_DEFINITIONS.length})</h2>
      </div>

      {unlockedAchievements.length > 0 && (
        <div className={styles.achievementsGrid}>
          {unlockedAchievements.map((ach, i) => (
            <div key={ach.id} className={`${styles.achCard} ${styles.achUnlocked}`} style={{ animationDelay: `${i * 40}ms` }}>
              <div className={styles.achIconWrap}>{achievementIcons[ach.icon] || <Trophy size={24} />}</div>
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
          <h3 className={styles.sectionTitle} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            Locked ({lockedAchievements.length})
          </h3>
          <div className={styles.achievementsGrid}>
            {lockedAchievements.map((def, i) => (
              <div key={def.id} className={`${styles.achCard} ${styles.achLocked}`} style={{ animationDelay: `${i * 30}ms` }}>
                <div className={styles.achIconWrapLocked}><Lock size={20} /></div>
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
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            
            <div className={styles.modalContent}>
              {/* Quick Templates */}
              <div className={styles.templatesSection}>
                <span className={styles.templatesTitle}><Zap size={16} /> 1-Click Templates</span>
                <div className={styles.templatesGrid}>
                  {GOAL_TEMPLATES.map(template => (
                    <div key={template.id} className={styles.templateCard} onClick={() => applyTemplate(template)}>
                      <div className={styles.templateIcon}>{template.icon}</div>
                      <div className={styles.templateInfo}>
                        <span className={styles.templateTitle}>{template.title}</span>
                        <span className={styles.templateDesc}>{template.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formDivider}>Or Create Custom Goal</div>

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
              </form>
            </div>
            
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className={styles.submitBtn}>{t.goals.createGoal}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
