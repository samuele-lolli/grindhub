'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/i18n';
import styles from '../legal.module.css';

/**
 * TermsOfServicePage — Standard terms of service and acceptable use disclaimer.
 */
export default function TermsOfServicePage() {
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

      <h1 className={styles.title}>{isIt ? 'Termini di Servizio' : 'Terms of Service'}</h1>
      <span className={styles.lastUpdated}>
        {isIt ? 'Ultimo aggiornamento: Novembre 2024' : 'Last updated: November 2024'}
      </span>

      <div className={styles.content}>
        {isIt ? (
          <>
            <p>
              Ti invitiamo a leggere con attenzione i presenti Termini di Servizio (&quot;Termini&quot;) prima di utilizzare la piattaforma GrindHub.
            </p>

            <h2>1. Accettazione dei Termini</h2>
            <p>
              Effettuando la registrazione o accedendo a GrindHub, accetti integralmente i presenti Termini di Servizio. Se non concordi con essi, ti invitiamo a non utilizzare l&apos;applicazione.
            </p>

            <h2>2. Finalità e Natura del Servizio</h2>
            <p>
              GrindHub è esclusivamente uno strumento di tracciamento analitico, contabilità personale e social community per giocatori di poker sportivo (MTT). GrindHub <strong>NON è una sala da gioco</strong>, non offre giochi a soldi veri, non raccoglie scommesse e non fornisce consulenza finanziaria. L&apos;utente è l&apos;unico responsabile della veridicità dei dati inseriti.
            </p>

            <h2>3. Account Utente</h2>
            <p>
              L&apos;accesso a GrindHub avviene tramite Google OAuth. L&apos;utente è responsabile della custodia e della sicurezza delle proprie credenziali Google. GrindHub non risponde per accessi non autorizzati dovuti a negligenza dell&apos;utente.
            </p>

            <h2>4. Condotta nella Community Social</h2>
            <p>
              La piattaforma offre funzionalità di feed social, commenti e leaderboard. È severamente vietata la pubblicazione di contenuti diffamatori, offensivi, illegali o ingannevoli. GrindHub si riserva il diritto di rimuovere contenuti o sospendere account che violano le linee guida.
            </p>

            <h2>5. Limitazione di Responsabilità</h2>
            <p>
              La piattaforma viene fornita &quot;così com&apos;è&quot; (as-is). GrindHub non è responsabile per eventuali perdite economiche subite ai tavoli da poker o decisioni finanziarie basate sulle statistiche visualizzate nel software.
            </p>
          </>
        ) : (
          <>
            <p>
              Please read these Terms of Service (&quot;Terms&quot;) carefully before using the GrindHub platform.
            </p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By signing up or accessing GrindHub, you agree to be bound by these Terms of Service. If you do not agree with any part, please do not use the application.
            </p>

            <h2>2. Purpose &amp; Service Nature</h2>
            <p>
              GrindHub is strictly an analytics tracker and social platform for poker tournament grinders. GrindHub <strong>is NOT a gambling operator</strong>, does not offer real-money gaming, does not accept wagers, and does not provide financial advice. You are solely responsible for the accuracy of your logged data.
            </p>

            <h2>3. User Accounts</h2>
            <p>
              Authentication is provided securely through Google OAuth. You are responsible for maintaining the confidentiality of your credentials.
            </p>

            <h2>4. Community Conduct</h2>
            <p>
              GrindHub includes social features allowing you to share sessions and achievements. You agree not to post abusive, offensive, or fraudulent content. We reserve the right to suspend accounts that violate community rules.
            </p>

            <h2>5. Disclaimer of Liability</h2>
            <p>
              GrindHub is provided &quot;as is&quot;. We are not responsible for your financial decisions or poker table losses.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
