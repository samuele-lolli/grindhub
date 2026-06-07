'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Gamepad2, Star, Users, UserPlus, UserMinus, BarChart3, Edit3 } from 'lucide-react';
import { useProfileStore } from '@/stores/profile-store';
import { useSessionStore } from '@/stores/session-store';
import { useSocialStore } from '@/stores/social-store';
import { profileService } from '@/lib/services/profile-service';
import type { PlayerProfile } from '@/types';
import { useI18n } from '@/i18n';
import { formatCurrency, formatPercent, formatDate, formatNumber, getInitials, platformLabels, getSessionProfit, getProfitClass, formatDuration } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import styles from './page.module.css';

/**
 * ProfilePage — User profile and player discovery.
 * Renders the user's hero card with stats, recent activity feed, and a searchable
 * list of other players with follow/unfollow functionality.
 */
export default function ProfilePage() {
  const { t } = useI18n();
  const profile = useProfileStore(s => s.profile);
  const players = useProfileStore(s => s.players);
  const sessions = useSessionStore(s => s.sessions);
  const getStats = useSessionStore(s => s.getStats);
  const following = useSocialStore(s => s.following);
  const follow = useSocialStore(s => s.followUser);
  const unfollow = useSocialStore(s => s.unfollowUser);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedPlayers, setSearchedPlayers] = useState<PlayerProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const stats = useMemo(() => getStats(), [getStats]);

  // Recent sessions for activity feed
  const recentSessions = useMemo(() => sessions.slice(0, 8), [sessions]);

  // Filter players by search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await profileService.searchPlayers(searchQuery);
        setSearchedPlayers(results.filter(p => p.id !== profile?.id)); // Don't show self
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, profile?.id]);

  if (!profile) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 'var(--space-4)' }}>
        <Users size={48} style={{ color: 'var(--text-muted)' }} />
        <h2 style={{ color: 'var(--text-secondary)' }}>Setting up your profile...</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Data is loading, please wait a moment.</p>
      </div>
    );
  }

  const statItems = [
    { label: t.analytics.totalProfit, value: formatCurrency(stats.totalProfit, 'EUR', true), show: profile.privacy.showProfit, color: stats.totalProfit >= 0 ? 'green' : 'red' },
    { label: t.analytics.roi, value: formatPercent(stats.roi), show: profile.privacy.showROI, color: 'blue' },
    { label: t.analytics.itm, value: `${stats.itm.toFixed(1)}%`, show: profile.privacy.showITM, color: 'purple' },
    { label: t.analytics.volume, value: formatNumber(stats.totalSessions), show: profile.privacy.showVolume, color: 'gold' },
    { label: t.analytics.avgBuyIn, value: formatCurrency(stats.avgBuyIn, 'EUR'), show: profile.privacy.showAvgBuyIn, color: 'blue' },
    { label: t.analytics.hourlyRate, value: formatCurrency(stats.hourlyRate, 'EUR', true), show: profile.privacy.showHourlyRate, color: stats.hourlyRate >= 0 ? 'green' : 'red' },
    { label: t.analytics.biggestWin, value: formatCurrency(stats.biggestWin, 'EUR'), show: profile.privacy.showBiggestWin, color: 'gold' },
    { label: t.analytics.currentStreak, value: `${stats.currentStreak} wins`, show: profile.privacy.showCurrentStreak, color: stats.currentStreak > 0 ? 'green' : 'red' },
  ];

  return (
    <div className="page-container">
      {/* Hero Card */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.avatarLarge} style={{ background: typeof profile.avatar === 'string' && profile.avatar.startsWith('#') ? profile.avatar : 'var(--gradient-primary)' }}>
            {getInitials(profile.displayName)}
          </div>
          <div className={styles.heroInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.displayName}>{profile.displayName}</h1>
              <Link href="/settings" className={styles.editBtn}><Edit3 size={14} /> Edit</Link>
            </div>
            <span className={styles.username}>@{profile.username}</span>
            <p className={styles.bio}>{profile.bio}</p>
            <div className={styles.metaRow}>
              <span className={styles.meta}><MapPin size={14} /> {profile.country}</span>
              <span className={styles.meta}><Calendar size={14} /> {t.profile.memberSince} {formatDate(profile.joinedAt)}</span>
              <span className={styles.meta}><Gamepad2 size={14} /> MTT Player</span>
              <span className={styles.meta}><Star size={14} /> {profile.yearsPlaying} {t.profile.yearsPlaying}</span>
              <span className={styles.meta}><BarChart3 size={14} /> {profile.preferredStakes}</span>
            </div>
            <div className={styles.platformTags}>
              {profile.platforms.map(p => (
                <span key={p} className={styles.platformTag}>{platformLabels[p]}</span>
              ))}
            </div>
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
              <span className={styles.followCount}>{0}</span>
              <span className={styles.followLabel}>{t.profile.followers}</span>
            </div>
            <div className={styles.followDivider} />
            <div className={styles.followStat}>
              <span className={styles.followCount}>{stats.totalSessions}</span>
              <span className={styles.followLabel}>{t.profile.sessions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <h2 className="section-title">{t.profile.stats}</h2>
      <div className={styles.statsGrid}>
        {statItems.filter(s => s.show).map((stat, i) => {
          let tooltipContent = '';
          if (stat.label === t.analytics.totalProfit) tooltipContent = t.tooltips?.totalProfit || 'Net profit minus buy-ins.';
          if (stat.label === t.analytics.winRate) tooltipContent = t.tooltips?.winRate || 'Percentage of winning sessions.';
          if (stat.label === t.analytics.roi) tooltipContent = t.tooltips?.roi || 'Return on Investment.';

          return (
            <div key={i} className={`${styles.statItem} ${styles[`c${stat.color}`]}`} style={{ animationDelay: `${i * 50}ms` }}>
              <span className={styles.statLabel} style={{ display: 'flex', alignItems: 'center' }}>
                {stat.label}
                {tooltipContent && <Tooltip content={tooltipContent} position="top" />}
              </span>
              <span className={styles.statValue}>{stat.value}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.contentGrid}>
        {/* Recent Activity */}
        <div className={styles.activitySection}>
          <h2 className="section-title">{t.profile.recentActivity}</h2>
          <div className={styles.activityList}>
            {recentSessions.map((session, i) => {
              const profit = getSessionProfit(session);
              return (
                <div key={session.id} className={styles.activityRow} style={{ animationDelay: `${i * 40}ms` }}>
                  <div className={styles.activityDot} data-profit={profit >= 0 ? 'pos' : 'neg'} />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityName}>
                      {session.eventCount} Tournaments
                    </span>
                    <span className={styles.activityMeta}>{formatDate(session.date)} · {formatDuration(session.duration)}</span>
                  </div>
                  <span className={`${styles.activityProfit} ${getProfitClass(profit)}`}>
                    {formatCurrency(profit, 'EUR', true)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Discover Players */}
        <div className={styles.discoverSection}>
          <h2 className="section-title">Discover Players</h2>
          <div className={styles.searchWrap}>
            <input
              placeholder="Search players..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.playersList}>
            {searchedPlayers.length === 0 && !isSearching ? (
              <p className={styles.playerMeta} style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>No players found.</p>
            ) : searchedPlayers.map((player, i) => {
              const isFollowing = following.includes(player.id);
              return (
                <div key={player.id} className={styles.playerCard} style={{ animationDelay: `${i * 40}ms` }}>
                  <div className={styles.playerAvatar} style={{ background: typeof player.avatar === 'string' && player.avatar.startsWith('#') ? player.avatar : 'var(--gradient-primary)' }}>
                    {getInitials(player.displayName)}
                  </div>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>{player.displayName}</span>
                    <span className={styles.playerUsername}>@{player.username}</span>
                    <span className={styles.playerMeta}>{player.country} · MTT · {player.preferredStakes}</span>
                  </div>
                  <button
                    className={`${styles.followBtn} ${isFollowing ? styles.followingBtn : ''}`}
                    onClick={() => isFollowing ? unfollow(player.id) : follow(player.id)}
                  >
                    {isFollowing ? <><UserMinus size={12} /> Unfollow</> : <><UserPlus size={12} /> Follow</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
