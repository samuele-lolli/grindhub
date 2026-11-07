'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ListTodo,
  BarChart3,
  Users,
  User,
  Target,
  Settings,
  Spade,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profile-store';
import { useI18n } from '@/i18n';
import { Avatar } from '@/components/ui/Avatar';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const profile = useProfileStore((s) => s.profile);

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: t.nav.dashboard },
    { href: '/bankroll', icon: Wallet, label: t.nav.bankroll },
    { href: '/sessions', icon: ListTodo, label: t.nav.sessions },
    { href: '/analytics', icon: BarChart3, label: t.nav.analytics },
    { href: '/social', icon: Users, label: t.nav.social },
    { href: '/profile', icon: User, label: t.nav.profile },
    { href: '/goals', icon: Target, label: t.nav.goals },
    { href: '/settings', icon: Settings, label: t.nav.settings },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Spade className={styles.logoIcon} size={24} />
        <span className={styles.logoText}>GrindHub</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.legalLinks}>
        <Link href="/privacy">Privacy</Link>
        <span>•</span>
        <Link href="/terms">Terms</Link>
      </div>

      <div className={styles.userSection}>
        <div className={styles.userAvatarWrap}>
          <Avatar name={profile?.displayName || 'User'} src={profile?.avatar} size="md" />
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{profile?.displayName || 'Set up profile'}</span>
          <span className={styles.userTag}>@{profile?.username || 'guest'}</span>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()} 
          className={styles.logoutBtn}
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
