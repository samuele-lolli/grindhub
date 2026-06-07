import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', color: '#e2e8f0' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '24px', color: '#fff' }}>Privacy Policy</h1>
      <p style={{ marginBottom: '16px' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2 style={{ fontSize: '1.5rem', marginTop: '32px', marginBottom: '16px', color: '#fff' }}>1. Information We Collect</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        When you use GrindHub, we collect the following types of information:
        <br />- Account information (email, name, profile picture) via OAuth providers (Google, Apple).
        <br />- User-generated content (sessions, bankroll transactions, goals, posts).
        <br />- Usage data and analytics to improve the platform.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '32px', marginBottom: '16px', color: '#fff' }}>2. How We Use Your Information</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        We use the information we collect to:
        <br />- Provide, maintain, and improve our services.
        <br />- Sync your poker data across devices securely.
        <br />- Communicate with you regarding updates or support.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '32px', marginBottom: '16px', color: '#fff' }}>3. Data Security</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        We implement strong security measures, including Row Level Security (RLS) on our database, to ensure that your financial and session data is private and accessible only by you, unless you explicitly choose to make it public on the social feed.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '32px', marginBottom: '16px', color: '#fff' }}>4. Contact Us</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        If you have any questions about this Privacy Policy, please contact us at: <strong>samuele@example.com</strong>.
      </p>
    </div>
  );
}
