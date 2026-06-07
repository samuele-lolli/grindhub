import React from 'react';
import styles from '../legal.module.css';

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Privacy Policy</h1>
      <span className={styles.lastUpdated}>Last updated: June 2026</span>

      <div className={styles.content}>
        <p>Welcome to GrindHub. We respect your privacy and are committed to protecting your personal data. This Privacy Policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.</p>

        <h2>1. The Data We Collect</h2>
        <p>We believe in data minimization. We only collect the data necessary to provide our services:</p>
        <ul>
          <li><strong>Identity Data:</strong> Name and email address (provided via Google Authentication).</li>
          <li><strong>Profile Data:</strong> Username, avatar, and biography that you provide.</li>
          <li><strong>Usage Data:</strong> Poker sessions, bankroll transactions, and goals that you log on the platform.</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <p>We use your data solely to provide, improve, and personalize the GrindHub experience. We do not sell your personal data to third parties.</p>
        <ul>
          <li>To manage your account and authentication securely.</li>
          <li>To calculate your poker statistics and bankroll progression.</li>
          <li>To display your public profile (only the information you choose to make public).</li>
        </ul>

        <h2>3. Data Storage & Security</h2>
        <p>Your data is securely stored using Supabase, which provides enterprise-grade security and Row Level Security (RLS). This ensures your private data is completely isolated and inaccessible to anyone without your unique authentication token.</p>

        <h2>4. Your Legal Rights (Right to be Forgotten)</h2>
        <p>Under the GDPR, you have the right to request the deletion of your personal data. You can exercise this right at any time by navigating to <strong>Settings &gt; Privacy</strong> and clicking the "Delete Account" button. This action will permanently erase your profile, bankroll history, and sessions from our active databases.</p>

        <h2>5. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at privacy@grindhub.app.</p>
      </div>
    </div>
  );
}
