import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GrindHub — Poker Bankroll & Session Tracker',
    short_name: 'GrindHub',
    description: 'Track your poker grind, manage bankroll across rooms, and analyze tournament performance.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0e17',
    theme_color: '#0a0e17',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/opengraph-image.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
