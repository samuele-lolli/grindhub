'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import styles from './CookieBanner.module.css';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  return typeof window !== 'undefined' && !localStorage.getItem('cookie-consent');
}

function getServerSnapshot() {
  return false;
}

export function CookieBanner() {
  const isVisible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    window.dispatchEvent(new Event('storage'));
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    window.dispatchEvent(new Event('storage'));
  };

  if (!isVisible) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <h3 className={styles.title}>We use cookies</h3>
        <p className={styles.text}>
          GrindHub uses cookies to ensure you get the best experience on our website, keep you logged in securely, and analyze our traffic. 
          By clicking &quot;Accept All&quot;, you consent to our use of cookies. Read more in our{' '}
          <Link href="/privacy" className={styles.link}>
            Privacy Policy
          </Link>.
        </p>
      </div>
      <div className={styles.actions}>
        <button onClick={handleDecline} className={styles.declineBtn}>
          Decline Optional
        </button>
        <button onClick={handleAccept} className={styles.acceptBtn}>
          Accept All
        </button>
      </div>
    </div>
  );
}
