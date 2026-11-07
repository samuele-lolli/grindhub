'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from '../legal.module.css';

/**
 * PrivacyPolicyPage — Static GDPR-compliant privacy policy.
 * Renders data collection, usage, storage, and right-to-be-forgotten information.
 */
export default function PrivacyPolicyPage() {
  const { locale } = useI18n();
  const isIt = locale === 'it';

  return (
    <div className={styles.container}>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          {isIt ? 'Torna alla Dashboard' : 'Back to Dashboard'}
        </Link>
      </div>

      <h1 className={styles.title}>{isIt ? 'Informativa sulla Privacy' : 'Privacy Policy'}</h1>
      <span className={styles.lastUpdated}>
        {isIt ? 'Ultimo aggiornamento: Novembre 2024' : 'Last updated: November 2024'}
      </span>

      <div className={styles.content}>
        {isIt ? (
          <>
            <p>
              Benvenuto su GrindHub. Rispettiamo la tua privacy e ci impegniamo a proteggere i tuoi dati personali. La presente Informativa sulla Privacy spiega come gestiamo i tuoi dati quando utilizzi la nostra piattaforma e illustra i tuoi diritti in materia di privacy (conformemente al Regolamento Generale sulla Protezione dei Dati - GDPR).
            </p>

            <h2>1. Dati che Raccogliamo</h2>
            <p>Applichiamo rigorosamente il principio di minimizzazione dei dati. Raccogliamo esclusivamente le informazioni necessarie all&apos;erogazione del servizio:</p>
            <ul>
              <li><strong>Dati di Identità e Accesso:</strong> Nome, indirizzo email e identificativo utente univoco (forniti tramite autenticazione sicura Google OAuth).</li>
              <li><strong>Dati di Profilo:</strong> Username (@handle), display name, avatar, bio e impostazioni di visibilità scelte da te.</li>
              <li><strong>Dati di Attività e Grinding:</strong> Sessioni MTT, ledger e transazioni del bankroll, obiettivi e trofei registrati.</li>
            </ul>

            <h2>2. Finalità del Trattamento</h2>
            <p>I tuoi dati vengono trattati esclusivamente per il funzionamento della piattaforma e non saranno mai venduti a terzi:</p>
            <ul>
              <li>Gestire in sicurezza la tua sessione di autenticazione e l&apos;accesso ai tuoi conti.</li>
              <li>Calcolare metriche analitiche avanzate (ROI %, ABI, frequenza ITM, trend cumulativo).</li>
              <li>Mostrare il tuo profilo pubblico e le sessioni condivise nella community (rispettando al 100% i tuoi toggle di privacy).</li>
            </ul>

            <h2>3. Sicurezza e Conservazione dei Dati</h2>
            <p>
              I dati sono conservati su database PostgreSQL gestito tramite Supabase con crittografia at-rest e in-transit. L&apos;accesso alle tabelle è blindato da policy Row Level Security (RLS) che garantiscono che nessun altro utente possa accedere al tuo ledger o alle tue sessioni private.
            </p>

            <h2>4. Diritti dell&apos;Interessato ed Eliminazione Definitiva (Diritto all&apos;Oblio)</h2>
            <p>
              Ai sensi degli Articoli 17 e 20 del GDPR, hai il diritto di esportare i tuoi dati in formato leggibile da dispositivo automatico (CSV/JSON) o di richiederne la cancellazione immediata e permanente. Puoi esercitare l&apos;eliminazione del tuo account direttamente dall&apos;applicazione accedendo a <strong>Impostazioni &gt; Privacy &gt; Zona Pericolo</strong> e confermando con la digitazione di <code>ELIMINA</code>. L&apos;operazione distrugge in modo irreversibile tutti i tuoi dati da tutti i database attivi.
            </p>

            <h2>5. Contatti</h2>
            <p>Per qualsiasi domanda relativa alla privacy o all&apos;esercizio dei tuoi diritti, puoi contattarci all&apos;indirizzo privacy@grindhub.app.</p>
          </>
        ) : (
          <>
            <p>
              Welcome to GrindHub. We respect your privacy and are committed to protecting your personal data. This Privacy Policy informs you how we manage your information when you use our platform and outlines your privacy rights under GDPR.
            </p>

            <h2>1. The Data We Collect</h2>
            <p>We strictly apply data minimization principles. We only collect data necessary to provide our tracker:</p>
            <ul>
              <li><strong>Identity &amp; Auth Data:</strong> Name, email address, and unique user identifier (provided via secure Google OAuth).</li>
              <li><strong>Profile Data:</strong> Username (@handle), display name, avatar, bio, and custom visibility toggles.</li>
              <li><strong>Usage &amp; Grinding Data:</strong> Poker MTT sessions, bankroll ledger transactions, goals, and unlocked trophies.</li>
            </ul>

            <h2>2. How We Use Your Data</h2>
            <p>We process your data solely to operate GrindHub. We will never sell your personal data to any third parties:</p>
            <ul>
              <li>To manage your account, authentication tokens, and ledger securely.</li>
              <li>To compute performance metrics (ROI %, ABI, ITM rate, cumulative trend).</li>
              <li>To display your public card and shared sessions according to your exact privacy settings.</li>
            </ul>

            <h2>3. Data Storage &amp; Security</h2>
            <p>
              Your data is stored using Supabase PostgreSQL databases with end-to-end encryption and Row Level Security (RLS). This ensures your private ledger and session records are completely inaccessible to other users.
            </p>

            <h2>4. Your Rights &amp; Permanent Erasure (Right to be Forgotten)</h2>
            <p>
              Under GDPR Articles 17 and 20, you have the right to export your data (CSV / JSON) or permanently delete your account. You can trigger complete erasure at any time in <strong>Settings &gt; Privacy &gt; Danger Zone</strong> by confirming with the word <code>DELETE</code>.
            </p>

            <h2>5. Contact Us</h2>
            <p>If you have any questions regarding this Privacy Policy, please contact us at privacy@grindhub.app.</p>
          </>
        )}
      </div>
    </div>
  );
}
