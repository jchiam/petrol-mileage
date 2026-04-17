import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, NetworkFirst, NetworkOnly, Serwist } from 'serwist';

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Static assets — cache first (versioned by build hash)
      matcher: /\/_next\/static\/.+/,
      handler: new CacheFirst({ cacheName: 'next-static' }),
    },
    {
      // App pages — network first, fall back to cache for offline shell
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
      }),
    },
    {
      // API routes — network only, never cache
      matcher: /\/api\/.+/,
      handler: new NetworkOnly(),
    },
  ],
});

serwist.addEventListeners();
