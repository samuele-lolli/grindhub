import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { CookieBanner } from '@/components/ui/CookieBanner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grindhub-ashy.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GrindHub — Track your grind. Own your game.',
    template: '%s | GrindHub',
  },
  description: 'Social poker bankroll management, session tracking, and analytics platform for poker players. Track MTT results, manage your bankroll, connect with other grinders.',
  keywords: ['poker', 'bankroll management', 'MTT tracker', 'poker analytics', 'poker social'],
  openGraph: {
    title: 'GrindHub — Track your grind. Own your game.',
    description: 'Social poker bankroll management, session tracking, and analytics platform for poker players.',
    url: siteUrl,
    siteName: 'GrindHub',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'GrindHub Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrindHub',
    description: 'Track your grind. Own your game. Poker analytics and social platform.',
    images: ['/opengraph-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
