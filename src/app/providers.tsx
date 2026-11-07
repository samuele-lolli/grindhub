'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { I18nProvider, useI18n } from '@/i18n';
import { ToastProvider } from '@/components/ui/Toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import LoginPage from '@/app/login/page';
import { Loader2, RefreshCw } from 'lucide-react';

// Import stores and services
import { useProfileStore } from '@/stores/profile-store';
import { useSessionStore } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useSocialStore } from '@/stores/social-store';
import { useGoalsStore } from '@/stores/goals-store';
import { useSettingsStore } from '@/stores/settings-store';

import { profileService } from '@/lib/services/profile-service';
import { sessionService } from '@/lib/services/session-service';
import { bankrollService } from '@/lib/services/bankroll-service';
import { socialService } from '@/lib/services/social-service';
import { goalsService } from '@/lib/services/goals-service';
import { demoService } from '@/lib/services/demo-service';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <I18nProvider>
        <RootContent>{children}</RootContent>
      </I18nProvider>
    </ToastProvider>
  );
}

/** Routes that must be accessible without authentication (GDPR, legal, login) */
const PUBLIC_ROUTES = ['/privacy', '/terms', '/login'];

/**
 * Seamlessly migrates any legacy `@supabase/supabase-js` localStorage session
 * into `@supabase/ssr` cookies on first load so returning users remain signed in.
 */
async function resolveInitialSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  if (typeof window !== 'undefined') {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.access_token && parsed?.refresh_token) {
              const { data: migrated } = await supabase.auth.setSession({
                access_token: parsed.access_token,
                refresh_token: parsed.refresh_token,
              });
              window.localStorage.removeItem(key);
              if (migrated.session) return migrated.session;
            }
          }
        } catch {
          // Ignore malformed legacy storage entries
        }
      }
    }
  }
  return null;
}

function RootContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, setLocale } = useI18n();
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  // Store setters
  const setupProfile = useProfileStore((s) => s.setupProfile);
  const setSessions = useSessionStore((s) => s.setSessions);
  const setAccounts = useBankrollStore((s) => s.setAccounts);
  const setTransactions = useBankrollStore((s) => s.setTransactions);
  const setPosts = useSocialStore((s) => s.setPosts);
  const setFollowing = useSocialStore((s) => s.setFollowing);
  const setFollowersCount = useSocialStore((s) => s.setFollowersCount);
  const setLeaderboard = useSocialStore((s) => s.setLeaderboard);
  const setGoals = useGoalsStore((s) => s.setGoals);
  const setAchievements = useGoalsStore((s) => s.setAchievements);
  const setLoggedIn = useProfileStore((s) => s.setLoggedIn);
  const setPlayers = useProfileStore((s) => s.setPlayers);
  const hydrateSettings = useSettingsStore((s) => s.hydrateSettings);

  const clearAllClientStores = useCallback(() => {
    setupProfile(null);
    setSessions([]);
    setAccounts([]);
    setTransactions([]);
    setPosts([]);
    setFollowing([]);
    setFollowersCount(0);
    setLeaderboard([]);
    setGoals([]);
    setAchievements([]);
    setPlayers([]);
  }, [
    setupProfile,
    setSessions,
    setAccounts,
    setTransactions,
    setPosts,
    setFollowing,
    setFollowersCount,
    setLeaderboard,
    setGoals,
    setAchievements,
    setPlayers,
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Remove legacy cross-account achievement cache if present
      window.localStorage.removeItem('goals-storage');
    }

    resolveInitialSession().then((resolvedSession) => {
      setSession(resolvedSession);
      setLoggedIn(!!resolvedSession);
      setLoadingAuth(false);

      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoggedIn(!!nextSession);
      setLoadingAuth(false);
      if (!nextSession) {
        setLoadedUserId(null);
        setLoadError(null);
        clearAllClientStores();
      }

      if (nextSession && typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, [setLoggedIn, clearAllClientStores]);

  useEffect(() => {
    let cancelled = false;

    async function loadData(userId: string) {
      setLoadError(null);
      try {
        // Ensure trigger-created profile exists
        let profile = null;
        let retries = 3;
        while (!profile && retries > 0) {
          profile = await profileService.getProfile(userId);
          if (!profile) {
            await new Promise((r) => setTimeout(r, 500));
            retries--;
          }
        }

        const [
          initialSessions,
          initialAccounts,
          initialTransactions,
          feed,
          following,
          followersCount,
          leaderboard,
          initialGoals,
          playersData,
        ] = await Promise.all([
          sessionService.fetchSessions(userId),
          bankrollService.fetchAccounts(userId),
          bankrollService.fetchTransactions(userId),
          socialService.fetchFeed(),
          socialService.fetchFollowing(userId),
          socialService.fetchFollowersCount(userId),
          socialService.fetchCommunityLeaderboard(),
          goalsService.fetchGoals(userId),
          profileService.searchPlayers(''),
        ]);

        let sessionsData = initialSessions;
        let accounts = initialAccounts;
        let transactions = initialTransactions;
        let goals = initialGoals;

        // Auto-seed realistic Demo Data for brand-new users on first login
        if (
          profile &&
          (!profile.demoStatus || profile.demoStatus === 'uninitialized') &&
          sessionsData.length === 0 &&
          accounts.length === 0
        ) {
          await demoService.seedDemoDataForNewUser(userId);
          const [seededProfile, seededSessions, seededAccounts, seededTransactions, seededGoals] =
            await Promise.all([
              profileService.getProfile(userId),
              sessionService.fetchSessions(userId),
              bankrollService.fetchAccounts(userId),
              bankrollService.fetchTransactions(userId),
              goalsService.fetchGoals(userId),
            ]);
          if (seededProfile) profile = seededProfile;
          sessionsData = seededSessions;
          accounts = seededAccounts;
          transactions = seededTransactions;
          goals = seededGoals;
        }

        if (cancelled) return;

        if (profile) {
          setupProfile(profile);

          // Hydrate cross-device preferences & locale
          if (profile.preferences) {
            hydrateSettings(profile.preferences);
            if (profile.preferences.locale === 'en' || profile.preferences.locale === 'it') {
              setLocale(profile.preferences.locale);
            }
          }

          // Strict per-account achievements from DB (no stale localStorage merge)
          const dbAchievements = (profile.achievements || []).map((achId) => ({
            id: achId,
            unlockedAt: profile?.joinedAt || new Date().toISOString(),
          }));
          setAchievements(dbAchievements);
        } else {
          setAchievements([]);
        }

        setSessions(sessionsData);
        setAccounts(accounts);
        setTransactions(transactions);
        setPosts(feed);
        setFollowing(following);
        setFollowersCount(followersCount);
        setLeaderboard(leaderboard);
        setGoals(goals);
        setPlayers(playersData);

        useSocialStore.getState().loadTrending().catch(() => {});
        setLoadedUserId(userId);
      } catch (err) {
        console.error('Failed to load initial data', err);
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Unable to synchronize data with server.'
          );
        }
      }
    }

    const activeUserId = session?.user?.id || null;
    if (activeUserId && loadedUserId !== activeUserId) {
      loadData(activeUserId);
    }

    return () => {
      cancelled = true;
    };
  }, [
    session?.user?.id,
    loadedUserId,
    retryCounter,
    setupProfile,
    hydrateSettings,
    setLocale,
    setSessions,
    setAccounts,
    setTransactions,
    setPosts,
    setFollowing,
    setFollowersCount,
    setLeaderboard,
    setGoals,
    setAchievements,
    setPlayers,
  ]);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublicRoute && !session) {
    return <>{children}</>;
  }

  if (loadError && session) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0e17',
          color: '#e2e8f0',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            textAlign: 'center',
            background: '#111827',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '28px',
          }}
        >
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f87171',
              marginBottom: '8px',
            }}
          >
            {locale === 'it' ? 'Errore di Sincronizzazione' : 'Sync Error'}
          </div>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '20px' }}>
            {loadError}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setLoadError(null);
                setRetryCounter((c) => c + 1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} />
              {locale === 'it' ? 'Riprova' : 'Retry'}
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #334155',
                background: 'transparent',
                color: '#94a3b8',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {locale === 'it' ? 'Esci' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingAuth || (session && loadedUserId !== session.user.id)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0e17',
          color: '#94a3b8',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
            }}
          >
            GrindHub
          </div>
          <Loader2 size={32} style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '0.875rem', marginTop: '16px' }}>
            {locale === 'it' ? 'Sincronizzazione dati in corso...' : 'Syncing your data...'}
          </div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes spin { 100% { transform: rotate(360deg); } }`,
          }}
        />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return <AppLayout>{children}</AppLayout>;
}
