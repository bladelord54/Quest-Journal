const CACHE_NAME = 'life-quest-journal-v181';
const LAZY_CACHE_NAME = 'life-quest-journal-lazy-v181';
const urlsToCache = [
  './',
  './index.html',
  './goal-manager.js',
  './audio-manager.js',
  './mobile-touch.js',
  './pwa-handler.js',
  './styles.css',
  './dark-mode.css',
  './animations.css',
  './mobile.css',
  './themes.css',
  './manifest.json',
  // Small particle/icon assets (safe to cache at install)
  './icons/coin.gif',
  './icons/leaf.gif',
  './icons/snow.gif',
  './icons/shine.gif',
  // Sound files (only files that exist on disk)
  './sounds/achievement-daily.wav',
  './sounds/achievement-weekly.wav',
  './sounds/achievement-monthly.wav',
  './sounds/achievement-yearly.wav',
  './sounds/achievement-life.wav',
  './sounds/spells.mp3',
  './sounds/notification.wav',
  './sounds/level-up.wav',
  './sounds/crystal-earn.wav',
  './sounds/boss-damage.mp3',
  './sounds/boss-defeated.mp3',
  // CDN dependencies for offline support
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css',
  'https://fonts.googleapis.com/css2?family=MedievalSharp&family=Cinzel:wght@400;600;700&family=Uncial+Antiqua&display=swap'
];

// Large assets cached lazily on first use (theme backgrounds, etc.)
const lazyAssets = [
  './icons/forest-bg.gif',
  './icons/desert-bg.gif',
  './icons/ice-bg.gif',
  './icons/volcanic-bg.gif',
  './icons/volcanic-bg.mp4',
  './icons/mystic-bg.gif',
  './icons/golden-bg.gif',
  './icons/shadow-bg.gif'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== LAZY_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Determine if this is a lazy-cacheable asset (large theme backgrounds)
  const isLazyAsset = lazyAssets.some(asset => url.pathname.endsWith(asset.replace('./', '')));

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Put lazy assets in the lazy cache, everything else in the main cache
          const targetCache = isLazyAsset ? LAZY_CACHE_NAME : CACHE_NAME;
          caches.open(targetCache)
            .then(cache => {
              if (event.request.url.indexOf('http') === 0) {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        }).catch(() => {
          // Network failed, try to serve offline page if available
          return caches.match('./index.html');
        });
      })
  );
});

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
