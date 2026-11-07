'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Gamepad2, Star, Users, UserPlus, UserCheck, BarChart3, Edit3, Share2, Trophy, Eye, Lock } from 'lucide-react';
import { useProfileStore } from '@/stores/profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useSessionStore } from '@/stores/session-store';
import { useSocialStore } from '@/stores/social-store';
import { useGoalsStore, ACHIEVEMENT_DEFINITIONS } from '@/stores/goals-store';
import { profileService } from '@/lib/services/profile-service';
import { PlayerProfile, PlayerStats } from '@/types';
import { useI18n } from '@/i18n';
import { formatCurrency, formatPercent, formatDate, formatNumber, platformLabels, getSessionProfit, formatDuration } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { PublicProfileModal } from '@/components/ui/PublicProfileModal';
import styles from './page.module.css';

/**
 * ProfilePage — User Player Card, Trophy Cabinet, and player discovery.
 * Displays all statistics with clear Public/Private badges for the authenticated user,
 * allows sharing formatted player cards, and enables searching and following other grinders.
 */
export default function ProfilePage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const profile = useProfileStore(s => s.profile);
  const settings = useSettingsStore(s => s.settings);
  const currency = settings?.currency || 'EUR';

  const sessions = useSessionStore(s => s.sessions);
  const getStats = useSessionStore(s => s.getStats);
  const following = useSocialStore(s => s.following);
  const followersCount = useSocialStore(s => s.followersCount);
  const follow = useSocialStore(s => s.followUser);
  const unfollow = useSocialStore(s => s.unfollowUser);
  const achievements = useGoalsStore(s => s.achievements);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchedPlayers, setSearchedPlayers] = useState<PlayerProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{ profile: PlayerProfile; stats: Partial<PlayerStats> | null } | null>(null);

  const handleViewProfile = async (userId: string) => {
    try {
      const data = await profileService.fetchPublicProfile(userId);
      if (data && data.profile) {
        setSelectedProfile(data);
      }
    } catch (err) {
      console.error('Error fetching public profile:', err);
    }
  };

  const stats = useMemo(() => getStats(sessions), [getStats, sessions]);

  const unlockedTrophies = useMemo(() => {
    const unlockedIds = new Set([
      ...(profile?.achievements || []),
      ...achievements.filter(a => a.unlockedAt).map(a => a.id),
    ]);
    return ACHIEVEMENT_DEFINITIONS.filter(d => unlockedIds.has(d.id));
  }, [profile?.achievements, achievements]);

  const handleSharePlayerCard = useCallback(async () => {
    if (!profile) return;
    const lines: string[] = [
      `♠ ${profile.displayName} (@${profile.username}) — GrindHub Player Card`,
      `Game: MTT · Stakes: ${profile.preferredStakes || 'Any'} · Country: ${profile.country || 'Global'}`,
    ];
    if (profile.privacy.showProfit) lines.push(`Profit: ${formatCurrency(stats.totalProfit, currency, true)}`);
    if (profile.privacy.showROI) lines.push(`ROI: ${formatPercent(stats.roi)}`);
    if (profile.privacy.showITM) lines.push(`ITM: ${stats.itm.toFixed(1)}%`);
    if (profile.privacy.showVolume) lines.push(`Volume: ${stats.totalTournaments} MTTs (${stats.totalSessions} sessions)`);
    if (unlockedTrophies.length > 0) {
      lines.push(`Trophies (${unlockedTrophies.length}): ${unlockedTrophies.map(tr => tr.name).join(', ')}`);
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success(t.profile.copiedCardToast || 'Player Card copied to clipboard!');
    } catch {
      toast.error(t.profile.copyErrorToast || 'Could not copy Player Card.');
    }
  }, [profile, stats, currency, unlockedTrophies, toast, t.profile]);

  // Recent sessions for activity feed
  const recentSessions = useMemo(() => sessions.slice(0, 8), [sessions]);

  // Filter players by search
  useEffect(() => {
    let stale = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await profileService.searchPlayers(searchQuery);
        if (!stale) {
          setSearchedPlayers(results.filter(p => p.id !== profile?.id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!stale) setIsSearching(false);
      }
    }, 300);
    return () => { stale = true; clearTimeout(timer); };
  }, [searchQuery, profile?.id]);

  if (!profile) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 'var(--space-4)' }}>
        <Users size={48} style={{ color: 'var(--text-muted)' }} />
        <h2 style={{ color: 'var(--text-secondary)' }}>{t.profile.settingUp}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{t.profile.pleaseWait}</p>
      </div>
    );
  }

  // All 8 statistics displayed for the owner, with individual Public/Private status indicators
  const statItems = [
    {
      label: t.analytics.totalProfit,
      value: formatCurrency(stats.totalProfit, currency, true),
      isPublic: profile.privacy?.showProfit ?? false,
      color: stats.totalProfit >= 0 ? 'green' : 'red',
      tooltip: t.tooltips?.totalProfit || 'Net profit minus tournament buy-ins.',
    },
    {
      label: t.analytics.roi,
      value: formatPercent(stats.roi),
      isPublic: profile.privacy?.showROI ?? false,
      color: 'blue',
      tooltip: t.tooltips?.roi || 'Return on Investment.',
    },
    {
      label: t.analytics.itm,
      value: `${stats.itm.toFixed(1)}%`,
      isPublic: profile.privacy?.showITM ?? false,
      color: 'purple',
      tooltip: t.tooltips?.itm || 'Percentage of MTTs finishing in the money.',
    },
    {
      label: 'MTT Volume',
      value: `${formatNumber(stats.totalTournaments)} MTTs (${stats.totalSessions}s)`,
      isPublic: profile.privacy?.showVolume ?? false,
      color: 'gold',
      tooltip: 'Total tournaments and grind sessions logged.',
    },
    {
      label: t.analytics.avgBuyIn,
      value: formatCurrency(stats.avgBuyIn, currency),
      isPublic: profile.privacy?.showAvgBuyIn ?? false,
      color: 'blue',
      tooltip: t.tooltips?.avgBuyIn || 'Average tournament entry stake.',
    },
    {
      label: t.analytics.hourlyRate,
      value: formatCurrency(stats.hourlyRate, currency, true),
      isPublic: profile.privacy?.showHourlyRate ?? false,
      color: stats.hourlyRate >= 0 ? 'green' : 'red',
      tooltip: t.tooltips?.hourlyRate || 'Net profit earned per hour of session play.',
    },
    {
      label: t.analytics.biggestWin,
      value: formatCurrency(stats.biggestWin, currency, true),
      isPublic: profile.privacy?.showBiggestWin ?? false,
      color: 'gold',
      tooltip: 'Best single-session net profit.',
    },
    {
      label: t.analytics.currentStreak,
      value: stats.currentStreak > 0 ? `+${stats.currentStreak}` : `${stats.currentStreak}`,
      isPublic: profile.privacy?.showCurrentStreak ?? false,
      color: stats.currentStreak >= 0 ? 'green' : 'red',
      tooltip: 'Current consecutive winning (+) or losing (-) sessions.',
    },
  ];

  return (
    <div className="page-container">
      {/* Hero Card */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.avatarLargeWrap}>
            <Avatar name={profile.displayName} src={profile.avatar} size="xl" showBorder />
          </div>
          <div className={styles.heroInfo}>
            <div className={styles.nameRow} style={{ flexWrap: 'wrap', gap: '8px' }}>
              <h1 className={styles.displayName}>{profile.displayName}</h1>
              <Link href="/settings" className={styles.editBtn}>
                <Edit3 size={14} /> {t.profile.editProfile}
              </Link>
              <button
                type="button"
                onClick={handleSharePlayerCard}
                className={styles.editBtn}
                style={{ cursor: 'pointer', borderColor: 'rgba(0, 210, 255, 0.35)', color: 'var(--accent-blue)' }}
              >
                <Share2 size={14} /> {t.profile.sharePlayerCard}
              </button>
            </div>
            <span className={styles.username}>@{profile.username}</span>
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
            <div className={styles.metaRow}>
              <span className={styles.meta}><MapPin size={14} /> {profile.country || 'Global'}</span>
              <span className={styles.meta}><Calendar size={14} /> {t.profile.memberSince} {formatDate(profile.joinedAt)}</span>
              <span className={styles.meta}><Gamepad2 size={14} /> {t.profile.mttPlayer}</span>
              <span className={styles.meta}><Star size={14} /> {profile.yearsPlaying} {t.profile.yearsPlaying}</span>
              <span className={styles.meta}><BarChart3 size={14} /> {profile.preferredStakes || 'Any'}</span>
            </div>
            {profile.platforms && profile.platforms.length > 0 && (
              <div className={styles.platformTags}>
                {profile.platforms.map(p => (
                  <span key={p} className={styles.platformTag}>{platformLabels[p] || p}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.followStats}>
            <div className={styles.followStat}>
              <span className={styles.followCount}>{following.length}</span>
              <span className={styles.followLabel}>{t.profile.following}</span>
            </div>
            <div className={styles.followDivider} />
            <div className={styles.followStat}>
              <span className={styles.followCount}>{followersCount}</span>
              <span className={styles.followLabel}>{t.profile.followers}</span>
            </div>
            <div className={styles.followDivider} />
            <div className={styles.followStat}>
              <span className={styles.followCount}>{stats.totalTournaments}</span>
              <span className={styles.followLabel}>MTTs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trophy Cabinet */}
      {unlockedTrophies.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Trophy size={18} style={{ color: 'var(--accent-gold)' }} /> {t.profile.trophyCabinet} ({unlockedTrophies.length}/{ACHIEVEMENT_DEFINITIONS.length})
          </h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {unlockedTrophies.map(trophy => (
              <div
                key={trophy.id}
                title={trophy.description}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '8px 14px', borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-gold-bg)', border: '1px solid rgba(255, 184, 0, 0.3)',
                  color: 'var(--accent-gold)', fontSize: '13px', fontWeight: 700
                }}
              >
                <span>🏅</span>
                <span>{trophy.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid — Always displays all metrics to the profile owner with clear privacy tags */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>{t.profile.stats}</h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {t.profile.privacySettings}: <Link href="/settings" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>{t.settings.privacy}</Link>
        </span>
      </div>

      <div className={styles.statsGrid}>
        {statItems.map((stat, i) => (
          <div key={i} className={`${styles.statItem} ${styles[`c${stat.color}`]}`} style={{ animationDelay: `${i * 50}ms` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span className={styles.statLabel} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {stat.label}
                {stat.tooltip && <Tooltip content={stat.tooltip} position="top" />}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: stat.isPublic ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  color: stat.isPublic ? 'var(--accent-green)' : 'var(--text-muted)',
                  border: `1px solid ${stat.isPublic ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                }}
                title={stat.isPublic ? t.profile.publicBadge : t.profile.privateBadge}
              >
                {stat.isPublic ? <Eye size={10} /> : <Lock size={10} />}
                {stat.isPublic ? t.profile.publicBadge : t.profile.privateBadge}
              </span>
            </div>
            <span className={styles.statValue}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className={styles.contentGrid}>
        {/* Recent Activity */}
        <div className={styles.activitySection}>
          <h2 className="section-title">{t.profile.recentActivity}</h2>
          <div className={styles.activityList}>
            {recentSessions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>No sessions logged yet.</p>
            ) : (
              recentSessions.map((session, i) => {
                const profit = getSessionProfit(session);
                return (
                  <div key={session.id} className={styles.activityRow} style={{ animationDelay: `${i * 40}ms` }}>
                    <div className={styles.activityDot} data-profit={profit >= 0 ? 'pos' : 'neg'} />
                    <div className={styles.activityInfo}>
                      <span className={styles.activityName}>
                        {session.eventCount} MTTs · {session.cashesCount} ITM
                      </span>
                      <span className={styles.activityMeta}>{formatDate(session.date)} · {formatDuration(session.duration)}</span>
                    </div>
                    <span className={`${styles.activityProfit} ${profit >= 0 ? styles.pos : styles.neg}`}>
                      {formatCurrency(profit, currency, true)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Discover Grinders */}
        <div className={styles.discoverSection}>
          <h2 className="section-title">{t.profile.discoverPlayers}</h2>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder={t.profile.searchPlayersPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          <div className={styles.playerList}>
            {isSearching ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>Searching...</div>
            ) : searchedPlayers.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                {t.profile.noPlayersFound}
              </div>
            ) : (
              searchedPlayers.map(p => {
                const isFollowed = following.includes(p.id);
                return (
                  <div key={p.id} className={styles.playerCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, cursor: 'pointer' }} onClick={() => handleViewProfile(p.id)}>
                      <Avatar name={p.displayName} src={p.avatar} size="md" />
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.displayName}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{p.username}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => (isFollowed ? unfollow(p.id) : follow(p.id))}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: isFollowed ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                        color: isFollowed ? 'var(--text-secondary)' : '#fff',
                        border: `1px solid ${isFollowed ? 'var(--border-primary)' : 'var(--accent-blue)'}`,
                      }}
                    >
                      {isFollowed ? (
                        <>
                          <UserCheck size={13} /> {t.profile.unfollow}
                        </>
                      ) : (
                        <>
                          <UserPlus size={13} /> {t.profile.follow}
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedProfile && (
        <PublicProfileModal
          selectedProfile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}
