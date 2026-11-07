'use client';

import React, { useEffect } from 'react';

interface GlobalErrorProps {
  error: unknown;
  retry: () => void;
}

export default function GlobalError({ error, retry }: GlobalErrorProps) {
  useEffect(() => {
    console.error('GrindHub Root Global Error Boundary caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>GrindHub — System Recovery</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#0a0e17',
          color: '#f0f4f8',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            background: '#121824',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '40px 32px',
            maxWidth: '480px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#ef4444',
              fontSize: '28px',
            }}
          >
            ♠
          </div>

          <h1
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '10px',
            }}
          >
            Critical System Interruption
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: '#94a3b8',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}
          >
            GrindHub encountered a root-level layout error. Your database records remain intact and secure.
          </p>

          <button
            type="button"
            onClick={() => retry()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 24px',
              borderRadius: '8px',
              background: '#00d2ff',
              color: '#0a0e17',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}

