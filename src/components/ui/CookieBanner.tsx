'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n';
import styles from './CookieBanner.module.css';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  return typeof window !== 'undefined' && !localStorage.getItem('grindhub-cookie-consent');
}

function getServerSnapshot() {
  return false;
}

export function CookieBanner() {
  const { t } = useI18n();
  const isVisible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleAccept = () => {
    localStorage.setItem('grindhub-cookie-consent', 'accepted');
    window.dispatchEvent(new Event('storage'));
  };

  const handleDecline = () => {
    localStorage.setItem('grindhub-cookie-consent', 'declined');
    window.dispatchEvent(new Event('storage'));
  };

  if (!isVisible) return null;

  return (
    <div className={styles.banner} role="region" aria-label="Cookie Consent">
      <div className={styles.content}>
        <h3 className={styles.title}>{t.cookies.title}</h3>
        <p className={styles.text}>
          {t.cookies.text}{' '}
          <Link href="/privacy" className={styles.link}>
            {t.cookies.privacyLink}
          </Link>
          .
        </p>
      </div>
      <div className={styles.actions}>
        <button onClick={handleDecline} className={styles.declineBtn} type="button">
          {t.cookies.declineOptional}
        </button>
        <button onClick={handleAccept} className={styles.acceptBtn} type="button">
          {t.cookies.acceptAll}
        </button>
      </div>
    </div>
  );
}
