'use client';

import React, { useState, useEffect } from 'react';
import { Settings, User, Shield, Globe, Moon, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { useProfileStore } from '@/stores/profile-store';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import type { Currency, AppSettings, Platform, GameType } from '@/types';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const PRESET_AVATARS = [
  '', // Default initials
  // Micah (Modern & Clean)
  'https://api.dicebear.com/9.x/micah/svg?seed=Felix',
  'https://api.dicebear.com/9.x/micah/svg?seed=Aneka',
  'https://api.dicebear.com/9.x/micah/svg?seed=Jasper',
  'https://api.dicebear.com/9.x/micah/svg?seed=Mia',
  'https://api.dicebear.com/9.x/micah/svg?seed=Leo',
  'https://api.dicebear.com/9.x/micah/svg?seed=Zoe',
  // Adventurer
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Jack',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Lily',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Oliver',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Chloe',
  // Bottts (Robots)
  'https://api.dicebear.com/9.x/bottts/svg?seed=Grinder',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Pro',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Alpha',
  'https://api.dicebear.com/9.x/bottts/svg?seed=Beta',
  // Avataaars
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Ryan',
  'https://api.dicebear.com/9.x/avataaars/svg?seed=Emma',
  // Notionists (Hand-drawn)
  'https://api.dicebear.com/9.x/notionists/svg?seed=Jack',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Jocelyn',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Aidan',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Brooklynn',
  // Fun Emoji
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Happy',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Cool',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Nerd',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Love',
  // Lorelei (Cute)
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Luna',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Milo',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Nala',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Simba',
  // Pixel Art
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Hero',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Mage',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Rogue',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Knight',
  // Big Smile
  'https://api.dicebear.com/9.x/big-smile/svg?seed=Grind',
  'https://api.dicebear.com/9.x/big-smile/svg?seed=Poker',
  'https://api.dicebear.com/9.x/big-smile/svg?seed=Cards',
  'https://api.dicebear.com/9.x/big-smile/svg?seed=Chips'
];

import styles from './page.module.css';

/**
 * SettingsPage — Application preferences, profile editing, and privacy controls.
 * Renders a tabbed interface for general settings, profile information, privacy toggles,
 * and account deletion (danger zone).
 */
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalProfile(profile);
  }, [profile]);

  const profileChanged = JSON.stringify(localProfile) !== JSON.stringify(profile);
  const settingsChanged = JSON.stringify(localSettings) !== JSON.stringify(settings);
  const isDirty = profileChanged || settingsChanged;

  const handleSave = () => {
    if (!localProfile) return;
    const settingsChanged = JSON.stringify(localSettings) !== JSON.stringify(settings);
    if (settingsChanged) {
      updateSettings(localSettings);
    }
    updateProfile(localProfile.id, {
      displayName: localProfile.displayName,
      bio: localProfile.bio,
      privacy: localProfile.privacy,
      avatar: localProfile.avatar,
      yearsPlaying: localProfile.yearsPlaying,
      primaryGameType: localProfile.primaryGameType,
      preferredStakes: localProfile.preferredStakes,
      platforms: localProfile.platforms
    });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm('Are you absolutely sure you want to delete your account? This will permanently delete all your sessions, bankroll history, and profile data. This action cannot be undone.');
    if (!confirm) return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to delete account on server');
      }

      await supabase.auth.signOut();
      window.localStorage.clear();
      router.push('/login');
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting your account. Please try again.');
      setIsDeleting(false);
    }
  };

  if (!localProfile) return null; // Profile must be setup

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
                    <button className={styles.uploadBtn} onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
                      Change Avatar
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
                          setLocalProfile(p => p ? {...p, avatar: url} : p);
                          setShowAvatarPicker(false);
                        }}
                      >
                        <Avatar name={localProfile.displayName} src={url} size="lg" />
                      </div>
                    ))}
                  </div>
                )}

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

                <div className={styles.divider} />
                <h3 className={styles.sectionSubtitle} style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Gaming Profile</h3>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Years Playing</label>
                    <input 
                      type="number" 
                      min="0"
                      max="50"
                      value={localProfile.yearsPlaying || 0} 
                      onChange={e => setLocalProfile(p => p ? {...p, yearsPlaying: parseInt(e.target.value) || 0} : p)} 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Main Game</label>
                    <select 
                      value={localProfile.primaryGameType || 'mtt'} 
                      onChange={e => setLocalProfile(p => p ? {...p, primaryGameType: e.target.value as GameType} : p)}
                    >
                      <option value="mtt">MTT (Tournaments)</option>
                      <option value="cash">Cash Game</option>
                      <option value="sng">Sit & Go</option>
                      <option value="spin">Spin & Go</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Preferred Stakes</label>
                    <select 
                      value={localProfile.preferredStakes || 'Low'} 
                      onChange={e => setLocalProfile(p => p ? {...p, preferredStakes: e.target.value} : p)}
                    >
                      <option value="Micro">Micro</option>
                      <option value="Low">Low</option>
                      <option value="Mid">Mid</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Platforms (comma separated)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. PokerStars, GGPoker, Winamax"
                    value={(localProfile.platforms || []).join(', ')} 
                    onChange={e => setLocalProfile(p => {
                      if (!p) return p;
                      const platforms = e.target.value.split(',').map(s => s.trim()).filter(Boolean) as Platform[];
                      return {...p, platforms};
                    })} 
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

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Show ITM</span>
                    <span className={styles.toggleDesc}>Display your In-The-Money percentage.</span>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={localProfile.privacy.showITM ?? false} 
                      onChange={e => setLocalProfile(p => p ? {...p, privacy: {...p.privacy, showITM: e.target.checked}} : p)} 
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Show Volume</span>
                    <span className={styles.toggleDesc}>Display your total tournaments played.</span>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={localProfile.privacy.showVolume ?? false} 
                      onChange={e => setLocalProfile(p => p ? {...p, privacy: {...p.privacy, showVolume: e.target.checked}} : p)} 
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Show Avg Buy-In</span>
                    <span className={styles.toggleDesc}>Display your average tournament buy-in.</span>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={localProfile.privacy.showAvgBuyIn ?? false} 
                      onChange={e => setLocalProfile(p => p ? {...p, privacy: {...p.privacy, showAvgBuyIn: e.target.checked}} : p)} 
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Show Biggest Win</span>
                    <span className={styles.toggleDesc}>Display your largest single-session profit.</span>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={localProfile.privacy.showBiggestWin ?? false} 
                      onChange={e => setLocalProfile(p => p ? {...p, privacy: {...p.privacy, showBiggestWin: e.target.checked}} : p)} 
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.divider} />

                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Auto-Share Goals</span>
                    <span className={styles.toggleDesc}>Automatically post to the Social Feed when you reach 100% of an active goal.</span>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={localProfile.privacy?.autoShareGoals ?? false} 
                      onChange={e => setLocalProfile(p => p ? {...p, privacy: {...p.privacy, autoShareGoals: e.target.checked}} : p)} 
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              <h2 className={styles.sectionTitle} style={{ marginTop: '2rem', color: 'var(--accent-red)' }}>Danger Zone</h2>
              <div className={styles.card} style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel} style={{ color: 'var(--accent-red)' }}>Delete Account</span>
                    <span className={styles.toggleDesc}>Permanently erase your account, sessions, and bankroll data.</span>
                  </div>
                  <button 
                    className={styles.deleteAccBtn} 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    <AlertTriangle size={16} />
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
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
            <span>You have unsaved changes.</span>
          </div>
          <button className={styles.saveBtn} onClick={handleSave}>Save Changes</button>
        </div>
      )}
      {isSaved && (
        <div className={styles.stickySaveBar} style={{ background: 'rgba(16, 185, 129, 0.9)', borderColor: 'var(--accent-green)' }}>
          <div className={styles.stickySaveBarText} style={{ color: '#fff' }}>
            <CheckCircle2 size={18} />
            <span>Settings saved successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}
