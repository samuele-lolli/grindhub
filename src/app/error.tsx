'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, AlertOctagon } from 'lucide-react';

interface ErrorProps {
  error: unknown;
  retry: () => void;
}

export default function ErrorPage({ error, retry }: ErrorProps) {
  useEffect(() => {
    console.error('GrindHub App Error Boundary caught:', error);
  }, [error]);

  const errorMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected error occurred.';

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 32px',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
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
            color: 'var(--accent-red)',
          }}
        >
          <AlertOctagon size={32} />
        </div>

        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '10px',
          }}
        >
          Unexpected Table Disconnect
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}
        >
          Something unexpected happened while rendering this view. Don&apos;t worry — your bankroll ledger and session records are securely preserved in the database.
        </p>

        {process.env.NODE_ENV !== 'production' && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-primary)',
              color: 'var(--accent-red)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              textAlign: 'left',
              marginBottom: '24px',
              overflowX: 'auto',
              maxHeight: '120px',
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => retry()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-blue)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            <RefreshCw size={15} />
            Reload View
          </button>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
          >
            <Home size={15} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

