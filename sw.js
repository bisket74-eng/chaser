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

// Show clean, tailored notification when a background push arrives
self.addEventListener('push', (event) => {
  let pushData = {};
  if (event.data) {
    try {
      pushData = event.data.json();
    } catch (e) {
      // Fallback if payload isn't clean JSON text
      pushData = { sender_name: 'A buddy' };
    }
  }

  // Extracts the specific name passed from the Edge Function
  const sender = pushData.sender_name || 'A buddy';
  const title = 'Chaser';
  
  const options = {
    body: `${sender} requested an updated location on Chaser.`,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'chaser-location-reminder',
    renotify: true,
    requireInteraction: true, // Glues it to the tray until tapped
    vibrate: [400, 200, 400],
    data: {
      url: self.registration.scope
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// When user taps the notification, bring Chaser to focus cleanly
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : './';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('chaser') || client.url.includes('index') || client.url === targetUrl) {
          if ('focus' in client) return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
