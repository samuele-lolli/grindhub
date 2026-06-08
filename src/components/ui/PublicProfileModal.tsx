import React from 'react';
import { X, CalendarDays, Gamepad2, Layers, Monitor } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency } from '@/lib/utils';
import styles from './PublicProfileModal.module.css';
import { getAvatarColor } from '@/lib/utils';

interface PublicProfileModalProps {
  selectedProfile: any;
  onClose: () => void;
}

export function PublicProfileModal({ selectedProfile, onClose }: PublicProfileModalProps) {
  if (!selectedProfile) return null;

  return (
    <div className={styles.profileModalOverlay} onClick={onClose}>
      <div className={styles.profileModal} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>
          <X size={16} />
        </button>
        <div className={styles.profileModalHeader}>
          <Avatar 
            name={selectedProfile.profile.displayName} 
            size="lg" 
          />
          <div>
            <span className={styles.profileModalName}>{selectedProfile.profile.displayName}</span>
            <span className={styles.profileModalUser}>@{selectedProfile.profile.username} • {selectedProfile.profile.country || 'Global'}</span>
          </div>
        </div>
        
        {selectedProfile.profile.bio && (
          <div className={styles.profileModalBio}>
            {selectedProfile.profile.bio}
          </div>
        )}

        <div className={styles.profileDetailsList}>
          <div className={styles.profileDetailItem}>
            <span className={styles.profileDetailLabel}>
              <CalendarDays size={14} /> Experience
            </span>
            <span className={styles.profileDetailValue}>
              {selectedProfile.profile.yearsPlaying ? `${selectedProfile.profile.yearsPlaying} years` : 'Not specified'}
            </span>
          </div>
          
          <div className={styles.profileDetailItem}>
            <span className={styles.profileDetailLabel}>
              <Gamepad2 size={14} /> Main Game
            </span>
            <span className={styles.profileDetailValue} style={{ textTransform: 'uppercase' }}>
              {selectedProfile.profile.primaryGameType || 'Mixed'}
            </span>
          </div>

          <div className={styles.profileDetailItem}>
            <span className={styles.profileDetailLabel}>
              <Layers size={14} /> Stakes
            </span>
            <span className={styles.profileDetailValue}>
              {selectedProfile.profile.preferredStakes || 'Any'}
            </span>
          </div>

          {selectedProfile.profile.platforms && selectedProfile.profile.platforms.length > 0 && (
            <div className={styles.profileDetailItem} style={{ alignItems: 'flex-start', marginTop: '4px' }}>
              <span className={styles.profileDetailLabel}>
                <Monitor size={14} /> Platforms
              </span>
              <div className={styles.platformBadges}>
                {selectedProfile.profile.platforms.map((p: string) => (
                  <span key={p} className={styles.platformBadge}>{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Public Statistics</h4>
        
        <div className={styles.publicStatsGrid}>
          {selectedProfile.stats?.totalSessions != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>Volume</span>
              <span className={styles.embedMetricValue}>{selectedProfile.stats.totalSessions} MTTs</span>
            </div>
          )}
          {selectedProfile.stats?.totalProfit != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>Profit</span>
              <span className={`${styles.embedMetricValue} ${selectedProfile.stats.totalProfit >= 0 ? styles.profitPos : styles.profitNeg}`}>
                {formatCurrency(selectedProfile.stats.totalProfit, 'EUR', true)}
              </span>
            </div>
          )}
          {selectedProfile.stats?.roi != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>ROI</span>
              <span className={styles.embedMetricValue}>{selectedProfile.stats.roi.toFixed(1)}%</span>
            </div>
          )}
          {selectedProfile.stats?.itm != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>ITM</span>
              <span className={styles.embedMetricValue}>{selectedProfile.stats.itm.toFixed(1)}%</span>
            </div>
          )}
          {selectedProfile.stats?.avgBuyIn != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>Avg Buy-in</span>
              <span className={styles.embedMetricValue}>{formatCurrency(selectedProfile.stats.avgBuyIn, 'EUR')}</span>
            </div>
          )}
          {selectedProfile.stats?.biggestWin != null && (
            <div className={styles.publicStatCard}>
              <span className={styles.embedMetricLabel}>Biggest Win</span>
              <span className={`${styles.embedMetricValue} ${styles.profitPos}`}>{formatCurrency(selectedProfile.stats.biggestWin, 'EUR')}</span>
            </div>
          )}
        </div>
        
        {(!selectedProfile.stats || Object.values(selectedProfile.stats).every(v => v === null)) && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px 0' }}>
            This user has chosen to keep their statistics private.
          </div>
        )}
      </div>
    </div>
  );
}
