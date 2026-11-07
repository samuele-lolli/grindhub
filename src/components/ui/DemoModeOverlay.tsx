'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trash2,
  Compass,
  CheckCircle2,
  Info,
  X,
  Loader2,
  Wallet,
  BarChart3,
  Target,
} from 'lucide-react';
import { useProfileStore } from '@/stores/profile-store';
import { demoService } from '@/lib/services/demo-service';
import { useI18n } from '@/i18n';
import { useToast } from './Toast';

export function DemoModeOverlay() {
  const { t } = useI18n();
  const profile = useProfileStore((s) => s.profile);
  const { toast } = useToast();

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const isDemoActive = profile?.demoStatus === 'active';

  useEffect(() => {
    if (!isDemoActive || !profile?.id) return;
    const storageKey = `grindhub_demo_welcome_seen_${profile.id}`;
    const alreadySeen = sessionStorage.getItem(storageKey);
    if (!alreadySeen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWelcomeModal(true);
      sessionStorage.setItem(storageKey, '1');
    }
  }, [isDemoActive, profile?.id]);

  useEffect(() => {
    if (!showWelcomeModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClearing) {
        setShowWelcomeModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showWelcomeModal, isClearing]);

  if (!isDemoActive || !profile) return null;

  const handleClearDemo = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      await demoService.clearDemoData(profile.id);
      setShowWelcomeModal(false);
      setConfirmClear(false);
      toast.success(t.demo.clearedToast);
    } catch (err) {
      console.error('Failed to clear demo data:', err);
      toast.error(t.demo.clearErrorToast);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      {/* Persistent Top Demo Banner */}
      <div
        style={{
          margin: '0 0 18px 0',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background:
            'linear-gradient(90deg, rgba(0, 210, 255, 0.14) 0%, rgba(157, 92, 255, 0.14) 100%)',
          border: '1px solid rgba(0, 210, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          boxShadow: '0 0 24px rgba(0, 210, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'var(--accent-blue)',
              color: '#050811',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={12} /> {t.demo.badge}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
            {t.demo.bannerText}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowWelcomeModal(true)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'rgba(13, 19, 34, 0.7)',
              border: '1px solid var(--border-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
          >
            <Info size={13} /> {t.demo.infoBtn}
          </button>

          {confirmClear ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearDemo}
                title={t.demo.resetNotice}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#fff',
                  background: 'var(--accent-red)',
                  border: '1px solid var(--accent-red)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                }}
              >
                {isClearing ? (
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Trash2 size={13} />
                )}
                {isClearing ? t.demo.clearing : t.demo.confirmClearBtn}
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setConfirmClear(false)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  cursor: 'pointer',
                }}
              >
                {t.demo.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--accent-red)',
                background: 'rgba(255, 59, 92, 0.12)',
                border: '1px solid rgba(255, 59, 92, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={13} /> {t.demo.clearBtn}
            </button>
          )}
        </div>
      </div>

      {/* Welcome Demo Modal Popup */}
      {showWelcomeModal && (
        <div
          onClick={() => !isClearing && setShowWelcomeModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(5, 8, 17, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(0, 210, 255, 0.45)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75), 0 0 32px rgba(0, 210, 255, 0.15)',
              padding: '24px',
              position: 'relative',
            }}
          >
            <button
              type="button"
              disabled={isClearing}
              onClick={() => setShowWelcomeModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                borderRadius: '4px',
                background: 'rgba(0, 210, 255, 0.12)',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                color: 'var(--accent-blue)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              <Sparkles size={13} /> {t.demo.onboardingBadge}
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            >
              {t.demo.welcomeTitle}, {profile.displayName || profile.username}!
            </h2>

            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '18px',
              }}
            >
              {t.demo.welcomeDesc}
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '14px',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(5, 8, 17, 0.55)',
                border: '1px solid var(--border-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <BarChart3
                  size={18}
                  style={{ color: 'var(--accent-blue)', marginTop: '2px', flexShrink: 0 }}
                />
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{t.demo.bullet1Title}</strong>{' '}
                  {t.demo.bullet1Desc}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Wallet
                  size={18}
                  style={{ color: 'var(--accent-green)', marginTop: '2px', flexShrink: 0 }}
                />
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{t.demo.bullet2Title}</strong>{' '}
                  {t.demo.bullet2Desc}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Target
                  size={18}
                  style={{ color: 'var(--accent-purple)', marginTop: '2px', flexShrink: 0 }}
                />
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{t.demo.bullet3Title}</strong>{' '}
                  {t.demo.bullet3Desc}
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: '18px',
                lineHeight: 1.5,
              }}
            >
              {t.demo.resetNotice}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowWelcomeModal(false)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--gradient-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <Compass size={17} /> {t.demo.exploreBtn}
              </button>

              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearDemo}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 59, 92, 0.1)',
                  color: 'var(--accent-red)',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: '1px solid rgba(255, 59, 92, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                {isClearing ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {isClearing ? t.demo.clearing : t.demo.clearNowBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
