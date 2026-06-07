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
        <h1 className={styles.title}>404</h1>
        <h2 className={styles.subtitle}>Page Not Found</h2>
        <p className={styles.desc}>
          Oops! It looks like you've gone all in on a hand that doesn't exist. 
          The page you are looking for has been moved, deleted, or possibly never existed.
        </p>
        <Link href="/" className={styles.homeBtn}>
          <Home size={18} />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
