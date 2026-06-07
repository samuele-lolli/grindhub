import React from 'react';
import styles from '../legal.module.css';

export default function TermsOfServicePage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Terms of Service</h1>
      <span className={styles.lastUpdated}>Last updated: June 2026</span>

      <div className={styles.content}>
        <p>Please read these Terms of Service (&quot;Terms&quot;) carefully before using the GrindHub platform operated by us.</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By registering for and using GrindHub, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.</p>

        <h2>2. Use of Service</h2>
        <p>GrindHub is a personal analytics and social tracking tool designed for poker players. You agree to use the service only for lawful purposes. You are responsible for the accuracy of the data you input into the system.</p>

        <h2>3. User Accounts</h2>
        <p>When you create an account with us via Google Authentication, you must provide accurate information. You are responsible for safeguarding your Google account credentials. We are not liable for any unauthorized access to your GrindHub account resulting from compromised Google credentials.</p>

        <h2>4. Social Features & Conduct</h2>
        <p>GrindHub includes social features allowing you to share sessions and achievements. You agree not to post abusive, offensive, or illegal content. We reserve the right to suspend or terminate accounts that violate community guidelines.</p>

        <h2>5. Disclaimer of Liability</h2>
        <p>GrindHub is an analytics tool and does not offer gambling services, financial advice, or host real-money games. We are not responsible for your financial decisions or poker losses. The platform is provided &quot;as is&quot; without warranties of any kind.</p>

        <h2>6. Modifications</h2>
        <p>We reserve the right to modify or replace these Terms at any time. We will provide notice of significant changes on our website. Your continued use of GrindHub after any changes indicates your acceptance of the new Terms.</p>
      </div>
    </div>
  );
}
