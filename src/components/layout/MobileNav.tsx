'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, BarChart3, Users, User, Wallet, Target, Settings, LogOut, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n';
import styles from './MobileNav.module.css';

export function MobileNav() {
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const tabs = [
    { href: '/', icon: LayoutDashboard, label: t.nav.dashboard },
    { href: '/bankroll', icon: Wallet, label: t.nav.bankroll },
    { href: '/sessions', icon: ListTodo, label: t.nav.sessions },
    { href: '/social', icon: Users, label: t.nav.social },
  ];

  // Close menu when route changes
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)}>
          <div className={styles.menuSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.menuHeader}>
              <h3>Menu</h3>
              <button className={styles.closeBtn} onClick={() => setMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.menuLinks}>
              <Link href="/analytics" className={styles.menuLink}>
                <BarChart3 size={20} /> <span>{t.nav.analytics}</span>
              </Link>
              <Link href="/profile" className={styles.menuLink}>
                <User size={20} /> <span>{t.nav.profile}</span>
              </Link>
              <Link href="/goals" className={styles.menuLink}>
                <Target size={20} /> <span>{t.nav.goals}</span>
              </Link>
              <Link href="/settings" className={styles.menuLink}>
                <Settings size={20} /> <span>{t.nav.settings}</span>
              </Link>
              <button onClick={() => supabase.auth.signOut()} className={`${styles.menuLink} ${styles.logoutLink}`}>
                <LogOut size={20} /> <span>{locale === 'it' ? 'Esci' : 'Log Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
        <button 
          className={`${styles.tab} ${menuOpen ? styles.active : ''}`} 
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen && <span className={styles.indicator} />}
          <Menu size={22} />
          <span className={styles.label}>Menu</span>
        </button>
      </nav>
    </>
  );
}
