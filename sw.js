const CACHE_NAME = 'buddy-finder-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// FIXED: Android Native Push Receiver Loop Hook
self.addEventListener('push', (event) => {
  let pushData = {};
  if (event.data) {
    try {
      pushData = event.data.json();
    } catch (e) {
      pushData = { sender_name: 'A buddy' };
    }
  }

  const sender = pushData.sender_name || 'A buddy';
  
  const options = {
    body: `${sender} requested an updated location on Chaser.`,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'chaser-location-reminder',
    renotify: true,
    requireInteraction: true, 
    vibrate: [300, 100, 300, 100, 400]
  };

  event.waitUntil(
    self.registration.showNotification('Chaser', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('chaser') || 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
