import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'GrindHub — Track your grind. Own your game.',
  description: 'Social poker bankroll management, session tracking, and analytics platform for poker players. Track MTT results, manage your bankroll, connect with other grinders.',
  keywords: ['poker', 'bankroll management', 'MTT tracker', 'poker analytics', 'poker social'],
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
