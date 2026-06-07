'use client';

import React from 'react';
import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <AlertTriangle size={64} className={styles.icon} />
        </div>
        <h1 className={styles.errorCode}>404</h1>
        <h2 className={styles.title}>Folded before the flop?</h2>
        <p className={styles.description}>
          We couldn&apos;t find the page you&apos;re looking for. It might have been moved or deleted.
        </p>
        <Link href="/" className={styles.homeBtn}>
          <Home size={18} />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
