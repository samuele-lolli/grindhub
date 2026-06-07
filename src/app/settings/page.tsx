'use client';

import React, { useState, useEffect } from 'react';
import { Settings, User, Shield, Globe, Save, Moon, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { useProfileStore } from '@/stores/profile-store';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import type { Currency, AppSettings } from '@/types';
import styles from './page.module.css';

export default function SettingsPage() {
  const { t } = useI18n();
  const settings = useSettingsStore(s => s.settings);
  const updateSettings = useSettingsStore(s => s.updateSettings);
  const profile = useProfileStore(s => s.profile);
  const updateProfile = useProfileStore(s => s.updateProfile);

  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'privacy'>('general');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [localProfile, setLocalProfile] = useState(profile);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalProfile(profile);
  }, [profile]);

  const handleSave = () => {
    updateSettings(localSettings);
    if (localProfile) {
      updateProfile(localProfile.id, {
        displayName: localProfile.displayName,
        bio: localProfile.bio,
        privacy: localProfile.privacy
      });
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!localProfile) return null; // Profile must be setup

  return (
    <div className="page-container">
      <div className="page-header">
        <div className={styles.headerTitle}>
          <Settings size={28} className={styles.titleIcon} />
          <h1 className="page-title">{t.settings.title}</h1>
        </div>
        <button className={cn(styles.saveBtn, isSaved && styles.savedBtn)} onClick={handleSave}>
          {isSaved ? <><CheckCircle2 size={18} /> Saved</> : <><Save size={18} /> Save Changes</>}
        </button>
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
              <h2 className={styles.sectionTitle}>Preferences</h2>
              
              <div className={styles.card}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Currency</label>
                    <select value={localSettings.currency} onChange={e => handleSettingChange('currency', e.target.value as Currency)}>
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="GBP">British Pound (£)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Language</label>
                    <select value={localSettings.locale} onChange={e => handleSettingChange('locale', e.target.value as 'en'|'it')}>
                      <option value="en">English (US)</option>
                      <option value="it">Italiano (IT)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.formGroup}>
                  <label>Theme</label>
                  <div className={styles.themeToggle}>
                    <button 
                      className={cn(styles.themeBtn, localSettings.theme === 'dark' && styles.activeTheme)}
                      onClick={() => handleSettingChange('theme', 'dark')}
                    >
                      <Moon size={18} /> Dark Mode
                    </button>
                  </div>
                </div>



                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Auto-Share Sessions</span>
                    <span className={styles.toggleDesc}>Automatically post your profitable sessions to the social feed.</span>
                  </div>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={localSettings.autoShareSessions} onChange={e => handleSettingChange('autoShareSessions', e.target.checked)} />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className={styles.section} style={{ animation: 'fadeInUp 0.3s ease' }}>
              <h2 className={styles.sectionTitle}>Profile Information</h2>
              
              <div className={styles.card}>
                <div className={styles.avatarSection}>
                  <Avatar name={localProfile.displayName} src={localProfile.avatar} size="xl" showBorder />
                  <div className={styles.avatarInfo}>
                    <span className={styles.avatarLabel}>@{localProfile.username}</span>
                    <button className={styles.uploadBtn}>Change Avatar</button>
                  </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.formGroup}>
                  <label>Display Name</label>
                  <input 
                    type="text" 
                    value={localProfile.displayName} 
                    onChange={e => setLocalProfile(p => p ? {...p, displayName: e.target.value} : p)} 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Bio</label>
                  <textarea 
                    rows={4} 
                    value={localProfile.bio || ''} 
                    onChange={e => setLocalProfile(p => p ? {...p, bio: e.target.value} : p)}
                    placeholder="Tell other players about yourself..."
                  />
                </div>
              </div>
            </div>
          )}

        {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className={styles.section} style={{ animation: 'fadeInUp 0.3s ease' }}>
              <h2 className={styles.sectionTitle}>Privacy & Visibility</h2>
              
              <div className={styles.card}>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Show Total Profit</span>
                    <span className={styles.toggleDesc}>Display your absolute monetary profit on your public profile.</span>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={localProfile.privacy.showProfit ?? false} 
                      onChange={e => setLocalProfile(p => p ? {...p, privacy: {...p.privacy, showProfit: e.target.checked}} : p)} 
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Show ROI</span>
                    <span className={styles.toggleDesc}>Display your Return on Investment percentage.</span>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={localProfile.privacy.showROI ?? false} 
                      onChange={e => setLocalProfile(p => p ? {...p, privacy: {...p.privacy, showROI: e.target.checked}} : p)} 
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
