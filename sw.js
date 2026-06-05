const CACHE_NAME = 'buddy-finder-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/@supabase/supabase-js@2'
];

// Install Service Worker and cache essential map assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Network-first strategy so live updates take priority, falling back to cache if service drops
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Show notification when a push arrives
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Chaser';
  const options = {
    body: data.body || 'Tap to update your location!',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'chaser-location-reminder',
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// When user taps the notification, bring the app to focus
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('chaser') || client.url.includes('index')) {
          return client.focus();
        }
      }
      return clients.openWindow('./');
    })
  );
});
