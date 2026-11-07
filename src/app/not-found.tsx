'use client';

import React from 'react';
import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from './not-found.module.css';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <AlertTriangle size={64} className={styles.icon} />
        </div>
        <h1 className={styles.errorCode}>404</h1>
        <h2 className={styles.title}>{t.errors.notFoundTitle}</h2>
        <p className={styles.description}>
          {t.errors.notFoundDesc}
        </p>
        <Link href="/" className={styles.homeBtn}>
          <Home size={18} />
          {t.errors.returnDashboard}
        </Link>
      </div>
    </div>
  );
}
