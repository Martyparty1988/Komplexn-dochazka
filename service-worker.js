// Cache name zahrnuje verzi (při změně kódu zvyšte verzi pro aktivaci nového SW)
const CACHE_NAME = 'pracovni-vykazy-v1.0';

// Soubory, které budou cachované při instalaci Service Workeru
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

// Instalace Service Workeru a cache souborů
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

// Aktivace Service Workeru a vyčištění starých cache
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

// Obsluha fetch událostí - strategie cache-first
self.addEventListener('fetch', (evt) => {
  console.log('[ServiceWorker] Fetch', evt.request.url);
  
  // Přeskočit fetch události typu chrome-extension
  if (evt.request.url.includes('chrome-extension')) return;
  
  evt.respondWith(
    caches.match(evt.request).then((cachedResponse) => {
      // Pokud je soubor v cache, vrátíme ho
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Pokud ne, fetchneme ze sítě a přidáme do cache
      return fetch(evt.request)
        .then((response) => {
          // Kontrola, jestli je response validní
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Zkopírujeme response (streams můžou být použity jen jednou)
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(evt.request, responseToCache);
            });
          
          return response;
        })
        .catch((err) => {
          console.log('[ServiceWorker] Fetch selhal', err);
          // Fallback obsah kdyby fetch selhal
          if (evt.request.url.indexOf('.html') > -1) {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// Událost pro synchronizaci v pozadí
self.addEventListener('sync', (evt) => {
  if (evt.tag === 'sync-data') {
    console.log('[ServiceWorker] Synchronizace dat');
    // Zde by byla implementace synchronizace dat se serverem, 
    // kdyby aplikace komunikovala se serverem
  }
});

// Událost pro push notifikace
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

// Událost pro kliknutí na notifikaci
self.addEventListener('notificationclick', (evt) => {
  console.log('[ServiceWorker] Notifikace kliknuta', evt);
  
  evt.notification.close();
  
  evt.waitUntil(
    clients.openWindow('/')
  );
});