'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useProfileStore } from '@/stores/profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { Avatar } from '@/components/ui/Avatar';
import styles from './TopBar.module.css';

export function TopBar() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const profile = useProfileStore((s) => s.profile);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const routeTitles: Record<string, string> = {
    '/': t.nav.dashboard,
    '/bankroll': t.nav.bankroll,
    '/sessions': t.nav.sessions,
    '/analytics': t.nav.analytics,
    '/social': t.nav.social,
    '/profile': t.nav.profile,
    '/leaderboard': t.nav.leaderboard,
    '/goals': t.nav.goals,
    '/settings': t.nav.settings,
  };

  const pageTitle = routeTitles[pathname] || 'GrindHub';

  const toggleLocale = () => {
    const next = locale === 'en' ? 'it' : 'en';
    setLocale(next);
    updateSettings({ locale: next });
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>
      <div className={styles.right}>
        <button
          className={styles.langBtn}
          onClick={toggleLocale}
          id="topbar-language"
          aria-label="Toggle language"
        >
          <Globe size={16} />
          <span>{locale.toUpperCase()}</span>
        </button>
        <div className={styles.avatarWrap} style={{ marginLeft: '12px' }}>
          <Avatar name={profile?.displayName || 'User'} src={profile?.avatar} size="sm" />
        </div>
      </div>
    </header>
  );
}
