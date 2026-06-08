'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Globe } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useProfileStore } from '@/stores/profile-store';
import styles from './TopBar.module.css';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/bankroll': 'Bankroll',
  '/sessions': 'Sessions',
  '/analytics': 'Analytics',
  '/social': 'Social',
  '/profile': 'Profile',
  '/leaderboard': 'Leaderboard',
  '/goals': 'Goals',
  '/settings': 'Settings',
};

export function TopBar() {
  const pathname = usePathname();
  const { locale, setLocale } = useI18n();
  const profile = useProfileStore((s) => s.profile);

  const pageTitle = routeTitles[pathname] || 'GrindHub';

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'it' : 'en');
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>
      <div className={styles.right}>

        <button className={styles.iconBtn} id="topbar-notifications" aria-label="Notifications">
          <Bell size={18} />
          <span className={styles.notifBadge}>3</span>
        </button>
        <button
          className={styles.langBtn}
          onClick={toggleLocale}
          id="topbar-language"
          aria-label="Toggle language"
        >
          <Globe size={16} />
          <span>{locale.toUpperCase()}</span>
        </button>
        <div className={styles.avatar}>
          {profile?.displayName?.[0]?.toUpperCase() || '?'}
        </div>
      </div>
    </header>
  );
}
