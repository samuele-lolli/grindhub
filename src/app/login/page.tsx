'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Spade, Loader2, Globe, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { useSettingsStore } from '@/stores/settings-store';
import styles from './page.module.css';

/**
 * LoginPage — Google OAuth authentication entry point.
 */
export default function LoginPage() {
  const { toast } = useToast();
  const { t, locale, setLocale } = useI18n();
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [isLoading, setIsLoading] = useState(false);

  const urlError = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('error_description') || params.get('error');
  }, []);

  const toggleLocale = () => {
    const next = locale === 'it' ? 'en' : 'it';
    setLocale(next);
    updateSettings({ locale: next });
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || t.login.authErrorDefault);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <button
          type="button"
          onClick={toggleLocale}
          aria-label="Toggle language"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 700,
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-primary)',
            cursor: 'pointer',
          }}
        >
          <Globe size={13} />
          {locale.toUpperCase()}
        </button>

        <div className={styles.logoWrap}>
          <Spade size={42} className={styles.logo} />
          <h1>GrindHub</h1>
        </div>

        <p className={styles.subtitle}>{t.login.subtitle}</p>

        {urlError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              textAlign: 'left',
              padding: '10px 12px',
              marginBottom: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 59, 92, 0.1)',
              border: '1px solid rgba(255, 59, 92, 0.35)',
              color: '#fca5a5',
              fontSize: '12px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--accent-red)' }} />
            <div>
              <strong style={{ display: 'block', color: '#fff', marginBottom: '2px' }}>
                {t.login.authErrorTitle}
              </strong>
              <span>{t.login.authErrorDefault}</span>
            </div>
          </div>
        )}

        <div className={styles.buttons}>
          <button
            className={styles.googleBtn}
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={20} className={styles.spin} />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className={styles.googleIcon}
              />
            )}
            {isLoading ? t.login.signingIn : t.login.continueWithGoogle}
          </button>
        </div>

        <div className={styles.legal}>
          {t.login.legalPrefix}{' '}
          <Link href="/terms">{t.login.termsLink}</Link> {t.login.andWord}{' '}
          <Link href="/privacy">{t.login.privacyLink}</Link>.
        </div>
      </div>

      <div className={styles.bgGlow} />
    </div>
  );
}
