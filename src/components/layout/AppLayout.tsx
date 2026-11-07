'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { DemoModeOverlay } from '@/components/ui/DemoModeOverlay';
import styles from './AppLayout.module.css';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <TopBar />
      <main className={styles.main}>
        <DemoModeOverlay />
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
