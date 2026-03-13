const CACHE_NAME = 'life-quest-journal-v206';
const LAZY_CACHE_NAME = 'life-quest-journal-lazy-v206';
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
let reminderSettings = null;
let lastTaskCounts = null;

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Receive reminder settings and task counts from the app
  if (event.data && event.data.type === 'SYNC_REMINDERS') {
    reminderSettings = event.data.settings;
    lastTaskCounts = event.data.taskCounts;
  }
});

// Handle notification click - open/focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(event.notification.data?.url || './');
    })
  );
});

// Periodic Background Sync - fires even when app is closed (Android Chrome)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkAndSendReminders());
  }
});

// Check if any reminders should fire based on stored settings
async function checkAndSendReminders() {
  if (!reminderSettings || !reminderSettings.enabled) return;
  
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  
  // Check morning reminder (within a 30-min window since periodic sync is imprecise)
  if (reminderSettings.morningReminder) {
    const morningTime = reminderSettings.morningTime;
    if (isWithinWindow(currentTime, morningTime, 30)) {
      await sendReminderNotification('morning');
    }
  }
  
  // Check evening reminder
  if (reminderSettings.eveningReminder) {
    const eveningTime = reminderSettings.eveningTime;
    if (isWithinWindow(currentTime, eveningTime, 30)) {
      await sendReminderNotification('evening');
    }
  }
}

// Check if currentTime is within minuteWindow of targetTime
function isWithinWindow(currentTime, targetTime, minuteWindow) {
  const [ch, cm] = currentTime.split(':').map(Number);
  const [th, tm] = targetTime.split(':').map(Number);
  const currentMins = ch * 60 + cm;
  const targetMins = th * 60 + tm;
  return currentMins >= targetMins && currentMins < targetMins + minuteWindow;
}

async function sendReminderNotification(type) {
  const counts = lastTaskCounts || { todayTasks: 0, incompleteHabits: 0, overdueTasks: 0 };
  
  let title, body;
  if (type === 'morning') {
    title = '🌅 Good Morning, Adventurer!';
    body = '';
    if (counts.todayTasks > 0) body += `📋 ${counts.todayTasks} task${counts.todayTasks !== 1 ? 's' : ''} for today`;
    if (counts.incompleteHabits > 0) body += (body ? ' • ' : '') + `🔄 ${counts.incompleteHabits} habit${counts.incompleteHabits !== 1 ? 's' : ''} to complete`;
    if (!body) body = 'Ready for a new day of quests!';
  } else {
    title = '🌙 Evening Quest Report';
    body = '';
    if (counts.todayTasks > 0) body += `📋 ${counts.todayTasks} task${counts.todayTasks !== 1 ? 's' : ''} remaining`;
    if (counts.overdueTasks > 0) body += (body ? ' • ' : '') + `⚠️ ${counts.overdueTasks} overdue`;
    if (!body) body = 'All quests completed! Well done!';
  }
  
  return self.registration.showNotification(title, {
    body: body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-96.png',
    tag: 'quest-reminder-' + type,
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: './' }
  });
}
