const CACHE_NAME = 'life-quest-journal-v125';
const urlsToCache = [
  './',
  './index.html',
  './goal-manager.js',
  './mobile-touch.js',
  './pwa-handler.js',
  './styles.css',
  './dark-mode.css',
  './animations.css',
  './mobile.css',
  './themes.css',
  './manifest.json',
  // Sound files (optional - will cache when first played)
  './sounds/achievement-daily.wav',
  './sounds/achievement-weekly.wav',
  './sounds/achievement-monthly.wav',
  './sounds/achievement-yearly.wav',
  './sounds/achievement-life.wav',
  './sounds/notification.wav',
  './sounds/spell.wav',
  './sounds/level-up.wav',
  './sounds/quest-complete.wav',
  './sounds/boss-damage.wav',
  './sounds/boss-defeated.wav',
  './sounds/crystal-earn.wav'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
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
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              // Only cache same-origin requests
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
