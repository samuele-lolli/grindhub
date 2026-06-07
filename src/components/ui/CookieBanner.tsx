'use client';

import React, { useState, useEffect } from 'react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#1e293b',
      borderTop: '1px solid #334155',
      padding: '16px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      zIndex: 9999,
      boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>We use cookies</h3>
        <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
          GrindHub uses cookies to ensure you get the best experience on our website, keep you logged in securely, and analyze our traffic. 
          By clicking &quot;Accept All&quot;, you consent to our use of cookies.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button 
          onClick={handleDecline}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #475569',
            color: '#f8fafc',
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Decline Optional
        </button>
        <button 
          onClick={handleAccept}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            border: 'none',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
