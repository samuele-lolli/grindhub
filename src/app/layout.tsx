import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://grindhub-ashy.vercel.app'),
  title: 'GRINDOS — Track your grind. Own your game.',
  description: 'Social poker bankroll management, session tracking, and analytics platform for poker players. Track MTT results, manage your bankroll, connect with other grinders.',
  keywords: ['poker', 'bankroll management', 'MTT tracker', 'poker analytics', 'poker social'],
  openGraph: {
    title: 'GRINDOS — Track your grind. Own your game.',
    description: 'Social poker bankroll management, session tracking, and analytics platform for poker players.',
    url: 'https://grindhub-ashy.vercel.app',
    siteName: 'GRINDOS',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'GRINDOS Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GRINDOS',
    description: 'Track your grind. Own your game. Poker analytics and social platform.',
    images: ['/opengraph-image.png'],
  },
};

import { CookieBanner } from '@/components/ui/CookieBanner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
