'use client';

import React, { useEffect, useCallback } from 'react';
import { X, CalendarDays, Gamepad2, Layers, Monitor, Trophy, UserPlus, UserCheck, Flame } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, platformLabels } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings-store';
import { useSocialStore } from '@/stores/social-store';
import { useProfileStore } from '@/stores/profile-store';
import { useI18n } from '@/i18n';
import { ACHIEVEMENT_DEFINITIONS } from '@/stores/goals-store';
import styles from './PublicProfileModal.module.css';
import { PlayerProfile, PlayerStats } from '@/types';

interface PublicProfileModalProps {
  selectedProfile: { profile: PlayerProfile; stats: Partial<PlayerStats> | null };
  onClose: () => void;
}

export function PublicProfileModal({ selectedProfile, onClose }: PublicProfileModalProps) {
  const { t } = useI18n();
  const settings = useSettingsStore(s => s.settings);
  const currency = settings?.currency || 'EUR';

  const myProfile = useProfileStore(s => s.profile);
  const isFollowing = useSocialStore(s => s.isFollowing);
  const follow = useSocialStore(s => s.followUser);
  const unfollow = useSocialStore(s => s.unfollowUser);

  const targetId = selectedProfile?.profile?.id;
  const isMe = myProfile?.id === targetId;
  const following = targetId ? isFollowing(targetId) : false;

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleToggleFollow = useCallback(async () => {
    if (!targetId || isMe) return;
    try {
      if (following) {
        await unfollow(targetId);
      } else {
        await follow(targetId);
      }
    } catch (err) {
      console.error('Failed to toggle follow status:', err);
    }
  }, [targetId, isMe, following, unfollow, follow]);

  if (!selectedProfile) return null;

  const { profile, stats } = selectedProfile;

  return (
    <div className={styles.profileModalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.profileModal} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close modal">
          <X size={16} />
        </button>

        <div className={styles.profileModalHeader}>
          <Avatar
            name={profile.displayName}
            src={profile.avatar}
            size="lg"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <span className={styles.profileModalName}>{profile.displayName}</span>
              {!isMe && targetId && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: following ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                    color: following ? 'var(--text-secondary)' : '#fff',
                    border: `1px solid ${following ? 'var(--border-primary)' : 'var(--accent-blue)'}`,
                  }}
                >
                  {following ? (
                    <>
                      <UserCheck size={13} /> {t.profile.unfollow}
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} /> {t.profile.follow}
                    </>
                  )}
                </button>
              )}
            </div>
            <span className={styles.profileModalUser}>@{profile.username} • {profile.country || 'Global'}</span>
          </div>
        </div>

        {profile.bio && (
          <div className={styles.profileModalBio}>
            {profile.bio}
          </div>
        )}

        <div className={styles.profileDetailsList}>
          <div className={styles.profileDetailItem}>
            <span className={styles.profileDetailLabel}>
              <CalendarDays size={14} /> {t.profile.experienceLabel}
            </span>
            <span className={styles.profileDetailValue}>
              {profile.yearsPlaying ? `${profile.yearsPlaying} ${t.profile.yearsPlaying}` : t.profile.notSpecified}
            </span>
          </div>

          <div className={styles.profileDetailItem}>
            <span className={styles.profileDetailLabel}>
              <Gamepad2 size={14} /> {t.profile.mainGameLabel}
            </span>
            <span className={styles.profileDetailValue} style={{ textTransform: 'uppercase' }}>
              {profile.primaryGameType || 'MTT'}
            </span>
          </div>

          <div className={styles.profileDetailItem}>
            <span className={styles.profileDetailLabel}>
              <Layers size={14} /> {t.profile.stakesLabel}
            </span>
            <span className={styles.profileDetailValue}>
              {profile.preferredStakes || 'Any'}
            </span>
          </div>

          {profile.platforms && profile.platforms.length > 0 && (
            <div className={styles.profileDetailItem} style={{ alignItems: 'flex-start', marginTop: '4px' }}>
              <span className={styles.profileDetailLabel}>
                <Monitor size={14} /> {t.profile.platformsLabel}
              </span>
              <div className={styles.platformBadges}>
                {profile.platforms.map((p: string) => (
                  <span key={p} className={styles.platformBadge}>
                    {platformLabels[p as keyof typeof platformLabels] || p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {t.profile.publicStatsTitle}
        </h4>

        <div className={styles.publicStatsGrid}>
          {stats?.totalTournaments != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>Volume</span>
              <span className={styles.embedMetricValue}>{stats.totalTournaments} MTTs</span>
            </div>
          )}
          {stats?.totalProfit != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>{t.analytics.totalProfit}</span>
              <span className={`${styles.embedMetricValue} ${stats.totalProfit >= 0 ? styles.profitPos : styles.profitNeg}`}>
                {formatCurrency(stats.totalProfit, currency, true)}
              </span>
            </div>
          )}
          {stats?.roi != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>{t.analytics.roi}</span>
              <span className={styles.embedMetricValue}>{stats.roi.toFixed(1)}%</span>
            </div>
          )}
          {stats?.itm != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>{t.analytics.itm}</span>
              <span className={styles.embedMetricValue}>{stats.itm.toFixed(1)}%</span>
            </div>
          )}
          {stats?.avgBuyIn != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>{t.analytics.avgBuyIn}</span>
              <span className={styles.embedMetricValue}>{formatCurrency(stats.avgBuyIn, currency)}</span>
            </div>
          )}
          {stats?.hourlyRate != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>{t.analytics.hourlyRate}</span>
              <span className={`${styles.embedMetricValue} ${stats.hourlyRate >= 0 ? styles.profitPos : styles.profitNeg}`}>
                {formatCurrency(stats.hourlyRate, currency, true)}/h
              </span>
            </div>
          )}
          {stats?.biggestWin != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>{t.analytics.biggestWin}</span>
              <span className={`${styles.embedMetricValue} ${styles.profitPos}`}>
                {formatCurrency(stats.biggestWin, currency, true)}
              </span>
            </div>
          )}
          {stats?.currentStreak != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>{t.analytics.currentStreak}</span>
              <span className={`${styles.embedMetricValue} ${stats.currentStreak >= 0 ? styles.profitPos : styles.profitNeg}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={14} />
                {stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak}
              </span>
            </div>
          )}
        </div>

        {(!stats || Object.values(stats).every(v => v === null || v === undefined)) && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
            {t.profile.allStatsPrivate}
          </div>
        )}

        {profile.achievements && profile.achievements.length > 0 && (
          <>
            <h4 style={{ margin: '20px 0 12px', fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trophy size={14} style={{ color: 'var(--accent-gold)' }} /> {t.profile.trophyCabinet} ({profile.achievements.length})
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profile.achievements.map((achId) => {
                const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === achId);
                return (
                  <div
                    key={achId}
                    title={def ? `${def.name}: ${def.description}` : achId.replace(/_/g, ' ')}
                    style={{
                      background: 'var(--accent-gold-bg)',
                      border: '1px solid rgba(255, 184, 0, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--accent-gold)'
                    }}
                  >
                    <span>🏅</span>
                    <span>{def ? def.name : achId.replace(/_/g, ' ')}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
