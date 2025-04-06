// [Celý obsah z původního dokumentu zůstává nezměněn]
const CACHE_NAME = 'pracovni-vykazy-v2.0';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Instaluji');
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Cachuji soubory');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Aktivuji');
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Odstraňuji starou cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  console.log('[ServiceWorker] Fetch', evt.request.url);
  if (evt.request.url.includes('chrome-extension')) return;
  evt.respondWith(
    caches.match(evt.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(evt.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(evt.request, responseToCache));
          return response;
        })
        .catch((err) => {
          console.log('[ServiceWorker] Fetch selhal', err);
          if (evt.request.url.indexOf('.html') > -1) return caches.match('/index.html');
        });
    })
  );
});

self.addEventListener('sync', (evt) => {
  if (evt.tag === 'sync-data') {
    console.log('[ServiceWorker] Synchronizace dat');
  }
});

self.addEventListener('push', (evt) => {
  console.log('[ServiceWorker] Push received', evt);
  let title = 'Pracovní výkazy & Finance';
  let options = {
    body: 'Nová aktualizace pro aplikaci.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png'
  };
  evt.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (evt) => {
  console.log('[ServiceWorker] Notifikace kliknuta', evt);
  evt.notification.close();
  evt.waitUntil(clients.openWindow('/'));
});