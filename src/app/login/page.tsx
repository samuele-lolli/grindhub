'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Spade, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.css';

/**
 * LoginPage — OAuth authentication entry point.
 * Renders branded sign-in buttons for Google and Apple providers via Supabase Auth.
 */
export default function LoginPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (provider: 'google' | 'apple') => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      if (error) throw error;
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || 'Error signing in');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Spade size={42} className={styles.logo} />
          <h1>GrindHub</h1>
        </div>
        
        <p className={styles.subtitle}>
          The ultimate tracking platform for MTT Grinders. Sign in to sync your Bankroll and Sessions across all devices.
        </p>

        <div className={styles.buttons}>
          <button 
            className={styles.googleBtn} 
            onClick={() => handleLogin('google')}
            disabled={isLoading}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {isLoading ? <Loader2 size={20} className={styles.spin} /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className={styles.googleIcon} />}
            Continue with Google
          </button>
          
          <button 
            className={styles.appleBtn} 
            onClick={() => handleLogin('apple')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={20} className={styles.spin} /> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className={styles.appleIcon}><path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 24 184.8 8 273.5q-9 59.4 25.5 116c17 27.6 37.2 56 65.4 56.4 27.6.4 38.3-16.4 71.4-16.4 33.1 0 42.6 16.4 72.3 16.4 30.6 0 47.9-25.2 64-51.5 21.6-35.6 30.6-70.1 31.4-71.8-1.1-.4-49.7-18.8-49.3-53.9zM212.4 122.5c16.5-21 27.2-48.4 24.2-76.5-24.1 1-52.1 16.1-69.2 36.5-14.8 17.5-27.4 46.1-23.8 73.4 26.6 2 52.3-12.4 68.8-33.4z"/></svg>}
            Continue with Apple
          </button>
        </div>

        <div className={styles.legal}>
          By signing in, you agree to our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
        </div>
      </div>
      
      <div className={styles.bgGlow} />
    </div>
  );
}
