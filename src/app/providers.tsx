'use client';

import React, { useEffect, useState } from 'react';
import { I18nProvider } from '@/i18n';
import { ToastProvider } from '@/components/ui/Toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import LoginPage from '@/app/login/page';
import { Loader2 } from 'lucide-react';

// Import stores and services
import { useProfileStore } from '@/stores/profile-store';
import { useSessionStore } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useSocialStore } from '@/stores/social-store';
import { useGoalsStore } from '@/stores/goals-store';

import { profileService } from '@/lib/services/profile-service';
import { sessionService } from '@/lib/services/session-service';
import { bankrollService } from '@/lib/services/bankroll-service';
import { socialService } from '@/lib/services/social-service';
import { goalsService } from '@/lib/services/goals-service';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <I18nProvider>
        <RootContent>{children}</RootContent>
      </I18nProvider>
    </ToastProvider>
  );
}

function RootContent({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Store setters
  const setupProfile = useProfileStore(s => s.setupProfile);
  const setSessions = useSessionStore(s => s.setSessions);
  const setAccounts = useBankrollStore(s => s.setAccounts);
  const setTransactions = useBankrollStore(s => s.setTransactions);
  const setPosts = useSocialStore(s => s.setPosts);
  const setFollowing = useSocialStore(s => s.setFollowing);
  const setGoals = useGoalsStore(s => s.setGoals);
  const setLoggedIn = useProfileStore(s => s.setLoggedIn);
  const setPlayers = useProfileStore(s => s.setPlayers);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoggedIn(!!session);
      setLoadingAuth(false);
      
      // Clean up the URL if it contains the OAuth access_token fragment
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoggedIn(!!session);
      setLoadingAuth(false);
      if (!session) setDataLoaded(false); // Reset on logout
      
      if (session && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, [setLoggedIn]);

  useEffect(() => {
    async function loadData() {
      if (!session?.user) return;
      
      try {
        const userId = session.user.id;
        
        // Wait a bit to ensure the profile is created by the database trigger
        // Sometimes the trigger takes a fraction of a second.
        let profile = null;
        let retries = 3;
        while (!profile && retries > 0) {
          profile = await profileService.getProfile(userId);
          if (!profile) {
            await new Promise(r => setTimeout(r, 500));
            retries--;
          }
        }
        
        const [
          sessionsData,
          accounts,
          transactions,
          feed,
          following,
          goals,
          playersData
        ] = await Promise.all([
          sessionService.fetchSessions(userId),
          bankrollService.fetchAccounts(userId),
          bankrollService.fetchTransactions(userId),
          socialService.fetchFeed(),
          socialService.fetchFollowing(userId),
          goalsService.fetchGoals(userId),
          profileService.searchPlayers('')
        ]);

        if (profile) setupProfile(profile);
        setSessions(sessionsData);
        setAccounts(accounts);
        setTransactions(transactions);
        setPosts(feed);
        setFollowing(following);
        setGoals(goals);
        setPlayers(playersData);

        setDataLoaded(true);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }

    if (session?.user && !dataLoaded) {
      loadData();
    }
  }, [session, dataLoaded, setupProfile, setSessions, setAccounts, setTransactions, setPosts, setFollowing, setGoals, setPlayers]);

  if (loadingAuth || (session && !dataLoaded)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', color: '#9aa7b4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.08em', background: 'linear-gradient(135deg, #00C27A, #00A368)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>GRINDOS</div>
          <Loader2 size={32} style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '0.875rem', marginTop: '16px' }}>Syncing your data...</div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}
