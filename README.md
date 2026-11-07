# GrindHub ♠️

GrindHub is a modern, social-first platform for tournament poker players (MTT Grinders) to track their bankroll, analyze their sessions, and connect with other grinders. Built with Next.js 16, Supabase, Zustand, and Chart.js, it offers a seamless, high-performance experience with a stunning "Midnight Grind" dark-mode UI.

## Features

- **Bankroll Management**: Track your funds across multiple poker rooms (PokerStars, GGPoker, Winamax, etc.), e-wallets, and bank accounts. Calculate "Playable Bankroll" vs Total Net Worth.
- **Session Tracking**: Log your tournament sessions, buy-ins, cashes, and platform splits.
- **Advanced Analytics**: Interactive charts showing Bankroll Over Time, ROI by Buy-in Level, Platform Breakdown, Results Distribution, and Monthly Win Rates.
- **Social Feed**: See how other players are performing, follow top grinders, share milestones, and stay motivated.
- **Dynamic Goals**: Set volume, profit, ROI, or playtime goals with automated progress tracking from logged sessions.
- **Sync Balances Modal**: Rapidly update balances across all active rooms at the end of a grind session.
- **Public Profile & Privacy**: Customize your player profile with fine-grained privacy controls for every stat.
- **Multi-language (i18n)**: Full Italian 🇮🇹 and English 🇬🇧 language support.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) & React 19
- **Backend / Database**: [Supabase](https://supabase.com/) (PostgreSQL with RLS & RPCs, Auth with Google/Apple OAuth)
- **Language**: TypeScript (Strict Mode)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Styling**: Vanilla CSS Modules (CSS custom properties, glassmorphism design tokens)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Chart.js](https://www.chartjs.org/) & `react-chartjs-2`
- **Internationalization**: Custom lightweight i18n hook (`useI18n`)

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm, yarn, or pnpm
- A Supabase project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/grindhub.git
   cd grindhub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.local.example` to `.env.local` and add your Supabase credentials:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only, for account deletion API)

4. Database Setup:
   Execute `supabase_schema.sql` in the Supabase SQL Editor to create tables, RLS policies, triggers, and RPC functions.

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Production Build

```bash
npm run build
npm run start
```
