'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, BarChart3, Users, User, Wallet } from 'lucide-react';
import styles from './MobileNav.module.css';

const tabs = [
  { href: '/', icon: LayoutDashboard, label: 'Home' },
  { href: '/bankroll', icon: Wallet, label: 'Bankroll' },
  { href: '/sessions', icon: ListTodo, label: 'Sessions' },
  { href: '/analytics', icon: BarChart3, label: 'Stats' },
  { href: '/social', icon: Users, label: 'Social' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.mobileNav}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
          >
            {isActive && <span className={styles.indicator} />}
            <tab.icon size={22} />
            <span className={styles.label}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
