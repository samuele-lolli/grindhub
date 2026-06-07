import React from 'react';

export default function TermsOfServicePage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', color: '#e2e8f0' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '24px', color: '#fff' }}>Terms of Service</h1>
      <p style={{ marginBottom: '16px' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2 style={{ fontSize: '1.5rem', marginTop: '32px', marginBottom: '16px', color: '#fff' }}>1. Acceptance of Terms</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        By accessing or using GrindHub, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you do not have permission to access the Service.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '32px', marginBottom: '16px', color: '#fff' }}>2. Description of Service</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        GrindHub is a platform designed to help poker players track their tournaments, bankroll, and goals. The data is for informational purposes only. We are not a gambling operator and do not process real money bets.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '32px', marginBottom: '16px', color: '#fff' }}>3. User Responsibilities</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '32px', marginBottom: '16px', color: '#fff' }}>4. Disclaimer</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We make no warranties regarding the accuracy, completeness, or reliability of any data you input into the platform.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '32px', marginBottom: '16px', color: '#fff' }}>5. Contact Us</h2>
      <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
        If you have any questions about these Terms, please contact us at: <strong>samuele@example.com</strong>.
      </p>
    </div>
  );
}
