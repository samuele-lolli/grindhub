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
import styles from './Sidebar.module.css';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/bankroll', icon: Wallet, label: 'Bankroll' },
  { href: '/sessions', icon: ListTodo, label: 'Sessions' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/social', icon: Users, label: 'Social' },
  { href: '/profile', icon: User, label: 'Profile' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const profile = useProfileStore((s) => s.profile);

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
        <div className={styles.userAvatar}>
          {profile?.displayName?.[0]?.toUpperCase() || '?'}
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
