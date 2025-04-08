// Jméno cache pro verzi 1
const cacheName = 'app-cache-v1';

// Statické soubory, které budou cachovány
const cacheAssets = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-b3/css/all.min.css'
    // Zde můžete přidat další statické soubory, jako jsou obrázky
];

// Instalace Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Instalace');
    
    // Přeskočí čekání a okamžitě aktivuje nový service worker
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(cacheName)
            .then(cache => {
                console.log('Service Worker: Ukládání souborů do cache');
                return cache.addAll(cacheAssets);
            })
            .then(() => console.log('Service Worker: Všechny soubory byly uloženy do cache'))
            .catch(err => console.error('Service Worker: Chyba při ukládání do cache', err))
    );
});

// Aktivace Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Aktivován');
    
    // Převzetí kontroly nad všemi klienty bez nutnosti refreshovat
    event.waitUntil(clients.claim());
    
    // Odstranění starých verzí cache
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== cacheName) {
                        console.log('Service Worker: Mazání staré cache -', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Strategie cache first, pak network
self.addEventListener('fetch', event => {
    // Ignoruj požadavky na Chrome-extension nebo jiné než HTTP/HTTPS
    if (!(event.request.url.startsWith('http'))) return;
    
    // Ignoruj POST a další non-GET požadavky
    if (event.request.method !== 'GET') return;
    
    // Strategie: vyzkoušet nejprve z cache, pak ze sítě
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Pokud máme v cache, vrátit z cache a zároveň aktualizovat z internetu
                if (cachedResponse) {
                    // Aktualizace cache na pozadí
                    fetch(event.request)
                        .then(networkResponse => {
                            if (networkResponse && networkResponse.status === 200) {
                                caches.open(cacheName)
                                    .then(cache => cache.put(event.request, networkResponse));
                            }
                        })
                        .catch(() => console.log('Service Worker: Aktualizace cache selhala, používá se stará verze'));
                    
                    return cachedResponse;
                }
                
                // Pokud není v cache, zkusit ze sítě a uložit do cache
                return fetch(event.request)
                    .then(networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        
                        // Nutné klonovat odpověď, protože ji použijeme dvakrát (pro cache a pro klienta)
                        const responseClone = networkResponse.clone();
                        
                        caches.open(cacheName)
                            .then(cache => {
                                cache.put(event.request, responseClone);
                            });
                            
                        return networkResponse;
                    })
                    .catch((err) => {
                        console.error('Service Worker: Fetch selhal', err);
                        // Pokud selže fetch, můžeme zde implementovat fallback stránku pro offline režim
                        // Například vrátit speciální stránku "offline.html"
                        return caches.match('/offline.html')
                            .then(offlineResponse => {
                                if (offlineResponse) {
                                    return offlineResponse;
                                }
                                // Jinak vrátíme původní chybu, pokud nemáme offline stránku
                                throw err;
                            });
                    });
            })
    );
});

// Komunikace mezi Service Workerem a klienty
self.addEventListener('message', event => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    
    // Další příkazy pro Service Worker můžete přidat zde
    if (event.data.action === 'timerUpdate') {
        // Zde můžete implementovat logiku pro zpracování času i když je aplikace zavřená
        console.log('Timer update received by Service Worker:', event.data);
        
        // Můžeme uložit data do IndexedDB
        // Implementace bude záviset na konkrétních požadavcích
    }
});

// Periodická synchronizace (pokud je podporována prohlížečem)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'timer-sync') {
        // Pravidelná aktualizace času
        event.waitUntil(backgroundTimerSync());
    }
});

async function backgroundTimerSync() {
    try {
        // Zde můžete implementovat logiku pro synchronizaci časovačů
        // Například načtení času z localStorage a aktualizace
        console.log('Background timer sync executed');
        
        // Získat všechny klienty
        const clients = await self.clients.matchAll();
        
        // Poslat zprávu všem klientům pro aktualizaci UI
        clients.forEach(client => {
            client.postMessage({
                type: 'TIMER_UPDATE',
                timestamp: Date.now()
            });
        });
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Implementace notifikací (pro upozornění na běžící časovač)
self.addEventListener('push', event => {
    const title = 'Časovač běží';
    const options = {
        body: 'Máte spuštěný časovač',
        icon: '/icons/timer-icon.png',
        badge: '/icons/badge-icon.png',
        actions: [
            { action: 'stop', title: 'Zastavit' },
            { action: 'open', title: 'Otevřít' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Reakce na kliknutí na notifikaci
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'stop') {
        // Logika pro zastavení časovače
        event.waitUntil(
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'STOP_TIMER'
                    });
                });
            })
        );
    } else if (event.action === 'open' || event.action === '') {
        // Otevřít aplikaci a zaměřit se na ni
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(windowClients => {
                // Zkontrolovat, jestli je již okno otevřené
                for (let client of windowClients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Pokud není otevřené, otevřít nové
                if (self.clients.openWindow) {
                    return self.clients.openWindow('/');
                }
            })
        );
    }
});

// Implementace background-fetch pro dlouhotrvající operace jako export dat
self.addEventListener('backgroundfetchsuccess', event => {
    const bgFetch = event.registration;
    
    event.waitUntil(async function() {
        try {
            // Získat výsledek background fetch
            const records = await bgFetch.matchAll();
            
            // Zpracování výsledků
            const promises = records.map(async record => {
                const response = await record.responseReady;
                // Zde můžete zpracovat výsledek
            });
            
            await Promise.all(promises);
            
            // Oznámení o dokončení
            self.registration.showNotification('Export dokončen', {
                body: `Export dat "${bgFetch.id}" byl úspěšně dokončen.`,
                icon: '/icons/success-icon.png'
            });
            
        } catch (err) {
            console.error('Background fetch failed:', err);
        }
    }());
});

// Zpracování chyb background fetch
self.addEventListener('backgroundfetchfail', event => {
    console.error('Background fetch failed:', event);
});

// Zpracování chyb
self.addEventListener('error', event => {
    console.error('Service Worker error:', event.error);
});