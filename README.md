# GrindHub ♠️

GrindHub is a modern, social-first platform for tournament poker players (MTT Grinders) to track their bankroll, analyze their sessions, and connect with other grinders. Built with Next.js 14, Zustand, and Chart.js, it offers a seamless, high-performance experience with a stunning dark-mode UI.

## Features

- **Bankroll Management**: Track your funds across multiple poker rooms (PokerStars, GGPoker, Winamax, etc.), e-wallets (Skrill, Neteller), and bank accounts. Calculate "Playable Bankroll" vs Total Net Worth.
- **Session Tracking**: Log your tournament sessions, buy-ins, cashes, and platform splits.
- **Advanced Analytics**: Interactive charts showing Bankroll Over Time, ROI by Buy-in Level, Platform Breakdown, Results Distribution, and Monthly Win Rates.
- **Social Feed**: See how other players are performing, follow top grinders, and stay motivated.
- **Dynamic Goals**: Set volume or profit goals and track your real-time progress.
- **Profile & Settings**: Customize your player profile, default tracking settings, privacy controls, and multi-currency displays.

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (with Persist middleware for local storage)
- **Styling**: Vanilla CSS Modules (custom design system, CSS variables, glassmorphism)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Chart.js](https://www.chartjs.org/) & `react-chartjs-2`
- **Internationalization**: Custom lightweight i18n hook (`useI18n`)

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

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

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture & Data Flow

GrindHub currently runs purely client-side for rapid prototyping and offline capabilities.
- **Stores**: The `src/stores` directory contains Zustand stores for `bankroll`, `sessions`, `social`, `goals`, `profile`, and `settings`.
- **Persistence**: All user data is saved to `localStorage` automatically via Zustand's persist middleware.
- **Mock Seeding**: The app automatically seeds 40 realistic mock sessions and bankroll states upon first load if the user is a new visitor. This logic is handled in `src/app/providers.tsx`.

## Production Deployment

To build the application for production:

```bash
npm run build
```

This will generate an optimized production build in the `.next` folder. You can then start the production server with:

```bash
npm run start
```

The app can be easily deployed to [Vercel](https://vercel.com/) by importing the GitHub repository.

## Roadmap

- [ ] Connect Zustand stores to a backend database (PostgreSQL + Prisma)
- [ ] Implement NextAuth for real Google/Apple authentication
- [ ] Add CSV import for PokerStars/GGPoker hand histories
- [ ] Add community leaderboards

## License

This project is licensed under the MIT License.
