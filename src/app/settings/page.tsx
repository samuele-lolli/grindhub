'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, User, Shield, Globe, Moon, CheckCircle2, AlertTriangle, FileSpreadsheet, FileJson, X, Trash2 } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { useProfileStore } from '@/stores/profile-store';
import { useSessionStore } from '@/stores/session-store';
import { useBankrollStore } from '@/stores/bankroll-store';
import { useGoalsStore } from '@/stores/goals-store';
import { useI18n } from '@/i18n';
import { cn, platformLabels, downloadCsv, downloadJson, getSessionProfit } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import type { Currency, AppSettings, Platform, GameType, Locale } from '@/types';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import styles from './page.module.css';

const PRESET_AVATARS = [
  '', // Default initials
  'https://api.dicebear.com/9.x/micah/svg?seed=Felix',
  'https://api.dicebear.com/9.x/micah/svg?seed=Aneka',
  'https://api.dicebear.com/9.x/micah/svg?seed=Jasper',
  'https://api.dicebear.com/9.x/micah/svg?seed=Mia',
  'https://api.dicebear.com/9.x/micah/svg?seed=Leo',
  'https://api.dicebear.com/9.x/micah/svg?seed=Zoe',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Jack',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Lily',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Oliver',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Chloe',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Grinder',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Pro',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Alpha',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Beta',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Ryan',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Emma',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Jack',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Jocelyn',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Aidan',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Brooklynn',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Happy',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Cool',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Nerd',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Love',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Luna',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Milo',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Nala',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Simba',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Hero',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Mage',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Rogue',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Knight',
  'https://api.dicebear.com/9.x/big-smile/svg?seed=Grind',
  'https://api.dicebear.com/9.x/big-smile/svg?seed=Poker',
  'https://api.dicebear.com/9.x/big-smile/svg?seed=Cards',
  'https://api.dicebear.com/9.x/big-smile/svg?seed=Chips',
];

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * SettingsPage — Application preferences, profile editing, GDPR exports, and account management.
 */
export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const settings = useSettingsStore(s => s.settings);
  const updateSettings = useSettingsStore(s => s.updateSettings);

  const profile = useProfileStore(s => s.profile);
  const updateProfile = useProfileStore(s => s.updateProfile);

  const sessions = useSessionStore(s => s.sessions);
  const accounts = useBankrollStore(s => s.accounts);
  const transactions = useBankrollStore(s => s.transactions);
  const goals = useGoalsStore(s => s.goals);

  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'privacy'>('general');
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings, locale: locale || settings.locale || 'en' });
  const [localProfile, setLocalProfile] = useState(profile);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSettings({ ...settings, locale: locale || settings.locale || 'en' });
  }, [settings, locale]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalProfile(profile);
  }, [profile]);

  const profileChanged = JSON.stringify(localProfile) !== JSON.stringify(profile);
  const settingsChanged = JSON.stringify(localSettings) !== JSON.stringify({ ...settings, locale: locale || settings.locale || 'en' });
  const isDirty = profileChanged || settingsChanged;

  // Validate username
  const handleUsernameChange = (raw: string) => {
    const cleaned = raw.replace(/\s+/g, '').replace(/^@/, '');
    setLocalProfile(p => (p ? { ...p, username: cleaned } : p));
    if (cleaned && !USERNAME_REGEX.test(cleaned)) {
      setUsernameError(t.settings.invalidUsernameErr || 'Username must be 3–30 characters: letters, numbers, and underscores only.');
    } else {
      setUsernameError(null);
    }
  };

  const handleSave = async () => {
    if (!localProfile || isSaving) return;

    const normalizedUsername = (localProfile.username || '').trim().replace(/^@/, '');
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      setUsernameError(t.settings.invalidUsernameErr || 'Username must be 3–30 characters: letters, numbers, and underscores only.');
      toast.error(t.settings.invalidUsernameErr || 'Invalid username format.');
      return;
    }

    setIsSaving(true);
    try {
      if (settingsChanged) {
        updateSettings(localSettings);
        if (localSettings.locale && localSettings.locale !== locale) {
          setLocale(localSettings.locale as Locale);
        }
      }

      if (profileChanged || settingsChanged) {
        await updateProfile(localProfile.id, {
          username: normalizedUsername,
          displayName: localProfile.displayName.trim() || normalizedUsername,
          country: localProfile.country,
          bio: localProfile.bio,
          privacy: localProfile.privacy,
          avatar: localProfile.avatar,
          yearsPlaying: localProfile.yearsPlaying,
          primaryGameType: localProfile.primaryGameType,
          preferredStakes: localProfile.preferredStakes,
          platforms: localProfile.platforms,
          preferences: localSettings,
        });
      }

      setIsSaved(true);
      toast.success(t.settings.savedToast || 'Settings saved successfully!');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(t.settings.saveErrorToast || 'Could not save profile changes. Username might already be taken.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  // ── GDPR Portability Exports ──
  const handleExportSessionsCsv = useCallback(() => {
    const rows = sessions.map(s => {
      const profit = getSessionProfit(s);
      const roi = s.totalBuyIns > 0 ? ((profit / s.totalBuyIns) * 100).toFixed(2) : '0.00';
      const abi = s.eventCount > 0 ? (s.totalBuyIns / s.eventCount).toFixed(2) : '0.00';
      return [
        s.date,
        s.platforms.map(p => platformLabels[p] || p).join(' | '),
        s.duration,
        s.eventCount,
        s.cashesCount,
        s.totalBuyIns.toFixed(2),
        s.totalCashes.toFixed(2),
        profit.toFixed(2),
        roi,
        abi,
        s.notes || '',
      ];
    });

    downloadCsv(
      `grindhub-sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      ['Date', 'Platforms', 'Duration_Min', 'Events_MTT', 'Cashes_ITM', 'Total_BuyIns', 'Total_Cashes', 'Net_Profit', 'ROI_Pct', 'Session_ABI', 'Notes'],
      rows
    );
    toast.success('Sessions CSV downloaded!');
  }, [sessions, toast]);

  const handleExportBankrollCsv = useCallback(() => {
    const accountMap = new Map(accounts.map(a => [a.id, a.name]));
    const rows = transactions.map(tx => [
      tx.date,
      accountMap.get(tx.accountId) || tx.accountId,
      tx.type,
      tx.amount.toFixed(2),
      tx.sessionId || '',
      tx.transferGroupId || '',
      tx.notes || '',
    ]);

    downloadCsv(
      `grindhub-bankroll-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      ['Date', 'Account', 'Transaction_Type', 'Amount', 'Session_ID', 'Paired_Transfer_ID', 'Notes'],
      rows
    );
    toast.success('Bankroll Ledger CSV downloaded!');
  }, [accounts, transactions, toast]);

  const handleExportFullJson = useCallback(() => {
    const payload = {
      exportDate: new Date().toISOString(),
      platformVersion: 'GrindHub v2.0 Production',
      profile,
      settings: localSettings,
      sessions,
      bankrollAccounts: accounts,
      bankrollTransactions: transactions,
      goals,
    };

    downloadJson(`grindhub-complete-backup-${format(new Date(), 'yyyy-MM-dd')}.json`, payload);
    toast.success('Full account backup JSON downloaded!');
  }, [profile, localSettings, sessions, accounts, transactions, goals, toast]);

  // ── Account Deletion ──
  const expectedConfirmation = locale === 'it' ? 'ELIMINA' : 'DELETE';
  const isDeleteConfirmed = deleteConfirmInput.trim().toUpperCase() === expectedConfirmation;

  const executeDeleteAccount = async () => {
    if (!isDeleteConfirmed || isDeleting) return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete account on server');
      }

      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
      }
      toast.info('Account deleted successfully.');
      router.push('/login');
    } catch (err) {
      console.error('Account deletion error:', err);
      toast.error('An error occurred while deleting your account. Please try again.');
      setIsDeleting(false);
    }
  };

  if (!localProfile) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className={styles.headerTitle}>
          <Settings size={28} className={styles.titleIcon} />
          <h1 className="page-title">{t.settings.title}</h1>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Sidebar Nav */}
        <div className={styles.navSidebar}>
          <button className={cn(styles.navBtn, activeTab === 'general' && styles.activeNav)} onClick={() => setActiveTab('general')}>
            <Globe size={18} /> {t.settings.general}
          </button>
          <button className={cn(styles.navBtn, activeTab === 'profile' && styles.activeNav)} onClick={() => setActiveTab('profile')}>
            <User size={18} /> {t.settings.profile}
          </button>
          <button className={cn(styles.navBtn, activeTab === 'privacy' && styles.activeNav)} onClick={() => setActiveTab('privacy')}>
            <Shield size={18} /> {t.settings.privacy}
          </button>
        </div>

        {/* Content Area */}
        <div className={styles.content}>
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className={styles.section} style={{ animation: 'fadeInUp 0.3s ease' }}>
              <h2 className={styles.sectionTitle}>{t.settings.preferencesTitle}</h2>

              <div className={styles.card}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>{t.settings.currency}</label>
                    <select value={localSettings.currency} onChange={e => handleSettingChange('currency', e.target.value as Currency)}>
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="GBP">British Pound (£)</option>
                    </select>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {t.settings.currencyNote}
                    </span>
                  </div>
                  <div className={styles.formGroup}>
                    <label>{t.settings.language}</label>
                    <select value={localSettings.locale || 'en'} onChange={e => handleSettingChange('locale', e.target.value as Locale)}>
                      <option value="en">English (EN)</option>
                      <option value="it">Italiano (IT)</option>
                    </select>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {t.settings.languageDesc}
                    </span>
                  </div>
                </div>

                <div className={styles.formRow} style={{ marginTop: '16px' }}>
                  <div className={styles.formGroup}>
                    <label>{t.settings.defaultPlatform}</label>
                    <select value={localSettings.defaultPlatform || 'pokerstars'} onChange={e => handleSettingChange('defaultPlatform', e.target.value as Platform)}>
                      {Object.entries(platformLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.formGroup}>
                  <label>{t.settings.themeLabel}</label>
                  <div className={styles.themeToggle}>
                    <button
                      type="button"
                      className={cn(styles.themeBtn, localSettings.theme === 'dark' && styles.activeTheme)}
                      onClick={() => handleSettingChange('theme', 'dark')}
                    >
                      <Moon size={18} /> {t.settings.darkMode}
                    </button>
                  </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>{t.settings.autoShareTitle}</span>
                    <span className={styles.toggleDesc}>{t.settings.autoShareDesc}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={localSettings.autoShareSessions}
                      onChange={e => handleSettingChange('autoShareSessions', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              {/* Data Portability (GDPR Art. 20) */}
              <h2 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>
                {t.settings.gdprDataTitle}
              </h2>
              <div className={styles.card}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {t.settings.gdprDataDesc}
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleExportSessionsCsv}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600,
                      background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)',
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <FileSpreadsheet size={16} className="text-blue" />
                    {t.settings.exportSessionsCsv}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportBankrollCsv}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600,
                      background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)',
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <FileSpreadsheet size={16} className="text-green" />
                    {t.settings.exportBankrollCsv}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportFullJson}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600,
                      background: 'var(--accent-purple-bg)', border: '1px solid var(--accent-purple)', color: 'var(--accent-purple)',
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <FileJson size={16} />
                    {t.settings.exportFullJson}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className={styles.section} style={{ animation: 'fadeInUp 0.3s ease' }}>
              <h2 className={styles.sectionTitle}>{t.settings.profileInfoTitle}</h2>

              <div className={styles.card}>
                <div className={styles.avatarSection}>
                  <Avatar name={localProfile.displayName} src={localProfile.avatar} size="xl" showBorder />
                  <div className={styles.avatarInfo}>
                    <span className={styles.avatarLabel}>@{localProfile.username}</span>
                    <button type="button" className={styles.uploadBtn} onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
                      {t.settings.changeAvatar}
                    </button>
                  </div>
                </div>

                {showAvatarPicker && (
                  <div className={styles.avatarPickerGrid} style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '12px' }}>
                    {PRESET_AVATARS.map((url, i) => (
                      <div
                        key={i}
                        style={{ cursor: 'pointer', borderRadius: '50%', overflow: 'hidden', border: localProfile.avatar === url ? '2px solid var(--accent-blue)' : '2px solid transparent', transition: 'all 0.2s' }}
                        onClick={() => {
                          setLocalProfile(p => (p ? { ...p, avatar: url } : p));
                          setShowAvatarPicker(false);
                        }}
                      >
                        <Avatar name={localProfile.displayName} src={url} size="lg" />
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.divider} />

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>{t.settings.displayNameLabel}</label>
                    <input
                      type="text"
                      value={localProfile.displayName}
                      onChange={e => setLocalProfile(p => (p ? { ...p, displayName: e.target.value } : p))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>{t.settings.usernameLabel}</label>
                    <input
                      type="text"
                      value={localProfile.username || ''}
                      onChange={e => handleUsernameChange(e.target.value)}
                      placeholder="username"
                    />
                    {usernameError ? (
                      <span style={{ fontSize: '11px', color: 'var(--accent-red)', marginTop: '4px' }}>
                        {usernameError}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {t.settings.usernameHint}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>{t.settings.countryLabel}</label>
                    <input
                      type="text"
                      value={localProfile.country || ''}
                      onChange={e => setLocalProfile(p => (p ? { ...p, country: e.target.value } : p))}
                      placeholder="e.g. Italy, UK, Malta, Brazil"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>{t.settings.bioLabel}</label>
                  <textarea
                    rows={3}
                    value={localProfile.bio || ''}
                    onChange={e => setLocalProfile(p => (p ? { ...p, bio: e.target.value } : p))}
                    placeholder={t.settings.bioPlaceholder}
                  />
                </div>

                <div className={styles.divider} />
                <h3 className={styles.sectionSubtitle} style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {t.settings.gamingProfileTitle}
                </h3>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>{t.settings.yearsPlayingLabel}</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={localProfile.yearsPlaying || 0}
                      onChange={e => setLocalProfile(p => (p ? { ...p, yearsPlaying: parseInt(e.target.value) || 0 } : p))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>{t.settings.mainGameLabel}</label>
                    <select
                      value={localProfile.primaryGameType || 'mtt'}
                      onChange={e => setLocalProfile(p => (p ? { ...p, primaryGameType: e.target.value as GameType } : p))}
                    >
                      <option value="mtt">MTT (Tournaments)</option>
                      <option value="cash" disabled>Cash Game (Coming Soon)</option>
                      <option value="sng" disabled>Sit &amp; Go (Coming Soon)</option>
                      <option value="spin" disabled>Spin &amp; Go (Coming Soon)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>{t.settings.preferredStakesLabel}</label>
                    <select
                      value={localProfile.preferredStakes || 'Low'}
                      onChange={e => setLocalProfile(p => (p ? { ...p, preferredStakes: e.target.value } : p))}
                    >
                      <option value="Micro">Micro (&lt; €5)</option>
                      <option value="Low">Low (€5 - €20)</option>
                      <option value="Mid">Mid (€20 - €100)</option>
                      <option value="High">High (€100+)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>{t.settings.activeRoomsLabel}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {(Object.entries(platformLabels) as [Platform, string][]).map(([platKey, platLabel]) => {
                      const isSelected = (localProfile.platforms || []).includes(platKey);
                      return (
                        <button
                          key={platKey}
                          type="button"
                          onClick={() => {
                            setLocalProfile(p => {
                              if (!p) return p;
                              const current = p.platforms || [];
                              const next = current.includes(platKey)
                                ? current.filter(x => x !== platKey)
                                : [...current, platKey];
                              return { ...p, platforms: next };
                            });
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: isSelected ? 'var(--accent-blue-bg)' : 'var(--bg-tertiary)',
                            color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                            border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                          }}
                        >
                          {platLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className={styles.section} style={{ animation: 'fadeInUp 0.3s ease' }}>
              <h2 className={styles.sectionTitle}>{t.settings.privacyVisibilityTitle}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {t.settings.privacyDesc}
              </p>

              <div className={styles.card}>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>{t.settings.privacyLabels.showProfit}</span>
                    <span className={styles.toggleDesc}>{t.settings.showProfitDesc}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={localProfile.privacy.showProfit ?? false}
                      onChange={e => setLocalProfile(p => (p ? { ...p, privacy: { ...p.privacy, showProfit: e.target.checked } } : p))}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>{t.settings.privacyLabels.showROI}</span>
                    <span className={styles.toggleDesc}>{t.settings.showRoiDesc}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={localProfile.privacy.showROI ?? false}
                      onChange={e => setLocalProfile(p => (p ? { ...p, privacy: { ...p.privacy, showROI: e.target.checked } } : p))}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>{t.settings.privacyLabels.showITM}</span>
                    <span className={styles.toggleDesc}>{t.settings.showItmDesc}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={localProfile.privacy.showITM ?? false}
                      onChange={e => setLocalProfile(p => (p ? { ...p, privacy: { ...p.privacy, showITM: e.target.checked } } : p))}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>{t.settings.privacyLabels.showVolume}</span>
                    <span className={styles.toggleDesc}>{t.settings.showVolumeDesc}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={localProfile.privacy.showVolume ?? false}
                      onChange={e => setLocalProfile(p => (p ? { ...p, privacy: { ...p.privacy, showVolume: e.target.checked } } : p))}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>{t.settings.privacyLabels.showAvgBuyIn}</span>
                    <span className={styles.toggleDesc}>{t.settings.showAbiDesc}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={localProfile.privacy.showAvgBuyIn ?? false}
                      onChange={e => setLocalProfile(p => (p ? { ...p, privacy: { ...p.privacy, showAvgBuyIn: e.target.checked } } : p))}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>{t.settings.privacyLabels.showHourlyRate}</span>
                    <span className={styles.toggleDesc}>{t.settings.showHourlyDesc}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={localProfile.privacy.showHourlyRate ?? false}
                      onChange={e => setLocalProfile(p => (p ? { ...p, privacy: { ...p.privacy, showHourlyRate: e.target.checked } } : p))}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>{t.settings.privacyLabels.showCurrentStreak}</span>
                    <span className={styles.toggleDesc}>{t.settings.showStreakDesc}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={localProfile.privacy.showCurrentStreak ?? false}
                      onChange={e => setLocalProfile(p => (p ? { ...p, privacy: { ...p.privacy, showCurrentStreak: e.target.checked } } : p))}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>{t.settings.privacyLabels.showBiggestWin}</span>
                    <span className={styles.toggleDesc}>{t.settings.showBiggestWinDesc}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={localProfile.privacy.showBiggestWin ?? false}
                      onChange={e => setLocalProfile(p => (p ? { ...p, privacy: { ...p.privacy, showBiggestWin: e.target.checked } } : p))}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>{t.settings.autoShareGoalsTitle}</span>
                    <span className={styles.toggleDesc}>{t.settings.autoShareGoalsDesc}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={localProfile.privacy?.autoShareGoals ?? false}
                      onChange={e => setLocalProfile(p => (p ? { ...p, privacy: { ...p.privacy, autoShareGoals: e.target.checked } } : p))}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <h2 className={styles.sectionTitle} style={{ marginTop: '2rem', color: 'var(--accent-red)' }}>
                {t.settings.dangerZone}
              </h2>
              <div className={styles.card} style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel} style={{ color: 'var(--accent-red)' }}>
                      {t.settings.deleteAccountTitle}
                    </span>
                    <span className={styles.toggleDesc}>
                      {t.settings.deleteAccountDesc}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.deleteAccBtn}
                    onClick={() => {
                      setDeleteConfirmInput('');
                      setShowDeleteModal(true);
                    }}
                  >
                    <Trash2 size={16} />
                    {t.settings.deleteAccountBtn}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Save Bar */}
      {isDirty && !isSaved && (
        <div className={styles.stickySaveBar}>
          <div className={styles.stickySaveBarText}>
            <AlertTriangle size={18} color="var(--accent-gold)" />
            <span>{t.settings.unsavedChanges}</span>
          </div>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving || !!usernameError}>
            {isSaving ? 'Saving...' : t.settings.saveChangesBtn}
          </button>
        </div>
      )}

      {isSaved && (
        <div className={styles.stickySaveBar} style={{ background: 'rgba(16, 185, 129, 0.95)', borderColor: 'var(--accent-green)' }}>
          <div className={styles.stickySaveBarText} style={{ color: '#fff' }}>
            <CheckCircle2 size={18} />
            <span>{t.settings.savedToast}</span>
          </div>
        </div>
      )}

      {/* Accessible Account Deletion Modal */}
      {showDeleteModal && (
        <div
          className={styles.deleteModalOverlay}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)', border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-lg)', maxWidth: '460px', width: '100%', padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-red)' }}>
                <AlertTriangle size={22} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{t.settings.deleteModalTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              {t.settings.deleteModalWarning}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {t.settings.typeToConfirm} <strong style={{ color: 'var(--accent-red)', letterSpacing: '1px' }}>{expectedConfirmation}</strong>
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
                placeholder={expectedConfirmation}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-mono)'
                }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px',
                  background: 'var(--bg-glass)', border: '1px solid var(--border-primary)',
                  color: 'var(--text-secondary)', cursor: 'pointer'
                }}
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={executeDeleteAccount}
                disabled={!isDeleteConfirmed || isDeleting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600,
                  background: isDeleteConfirmed ? 'var(--accent-red)' : 'rgba(239, 68, 68, 0.2)',
                  color: isDeleteConfirmed ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                  border: 'none', cursor: isDeleteConfirmed && !isDeleting ? 'pointer' : 'not-allowed'
                }}
              >
                <Trash2 size={14} />
                {isDeleting ? t.settings.deletingBtn : t.settings.deleteAccountBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
