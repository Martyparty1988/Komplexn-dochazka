const CACHE_NAME = 'pracovni-vykazy-cache-v1.1'; // Zvýšená verze cache při změnách
const DATA_CACHE_NAME = 'pracovni-vykazy-data-cache-v1'; // Samostatná cache pro data (pro případné odlišné strategie)

// Soubory k okamžitému cachování (základ aplikace)
const FILES_TO_CACHE = [
    '/', // Kořenový adresář (často mapován na index.html)
    '/index.html',
    '/app.js',
    '/style.css',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/favicon.ico',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    // Přidejte fonty, pokud je FontAwesome stahuje samostatně (často woff2 soubory)
    // Příklad: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2'
];

// --- Instalace Service Workera ---
self.addEventListener('install', (evt) => {
    console.log('[ServiceWorker] Instaluji...');
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Cachuji základní soubory aplikace.');
            return cache.addAll(FILES_TO_CACHE);
        }).catch(err => {
            console.error('[ServiceWorker] Chyba při cachování základních souborů:', err);
        })
    );
    self.skipWaiting(); // Aktivuje nového SW ihned po instalaci
});

// --- Aktivace Service Workera ---
self.addEventListener('activate', (evt) => {
    console.log('[ServiceWorker] Aktivuji...');
    // Odstranění starých verzí cache
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) { // Ponecháme aktuální aplikační a datovou cache
                    console.log('[ServiceWorker] Odstraňuji starou cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    // Převezme kontrolu nad otevřenými stránkami ihned
    self.clients.claim();
    console.log('[ServiceWorker] Aktivace dokončena.');
});

// --- Zachytávání Fetch požadavků ---
self.addEventListener('fetch', (evt) => {
    // Ignorujeme požadavky, které nejsou GET (např. POST na Firebase)
    if (evt.request.method !== 'GET') {
         // console.log('[ServiceWorker] Ignoruji non-GET požadavek:', evt.request.method, evt.request.url);
        return;
    }

     // Ignorujeme Chrome extension požadavky
     if (evt.request.url.startsWith('chrome-extension://')) {
        return;
     }

    // Strategie pro API/Firebase požadavky (Network first, fallback to cache)
    // Můžeme specificky cílit na URL databáze, pokud je to potřeba
     if (evt.request.url.includes('firebaseio.com')) { // Nebo konkrétnější URL vaší databáze
        // console.log('[ServiceWorker] Zpracovávám Firebase požadavek (Network first):', evt.request.url);
        evt.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return fetch(evt.request)
                    .then(response => {
                        // Pokud úspěšně načteno z networku, uložíme do datové cache
                        if (response && response.status === 200) {
                           // console.log('[ServiceWorker] Cachuji Firebase odpověď:', evt.request.url);
                           cache.put(evt.request.url, response.clone());
                        }
                        return response;
                    }).catch(err => {
                        // Pokud network selže, zkusíme vrátit z datové cache
                        console.log('[ServiceWorker] Network pro Firebase selhal, zkouším cache:', err);
                        return cache.match(evt.request);
                    });
            })
        );
        return; // Ukončíme zpracování pro Firebase
    }

    // Strategie pro ostatní (aplikační) soubory (Cache first, fallback to network)
   // console.log('[ServiceWorker] Zpracovávám aplikační požadavek (Cache first):', evt.request.url);
    evt.respondWith(
        caches.match(evt.request).then((cachedResponse) => {
            if (cachedResponse) {
               // console.log('[ServiceWorker] Vracím z cache:', evt.request.url);
                return cachedResponse; // Vrátíme z cache, pokud existuje
            }

           // console.log('[ServiceWorker] Není v cache, načítám z networku:', evt.request.url);
            // Pokud není v cache, načteme z networku
            return fetch(evt.request).then((response) => {
                // Cachujeme pouze platné odpovědi
                if (!response || response.status !== 200 || response.type !== 'basic' || !FILES_TO_CACHE.includes(new URL(evt.request.url).pathname)) {
                   // console.log('[ServiceWorker] Odpověď není cachovatelná nebo není v seznamu FILES_TO_CACHE:', evt.request.url, response.status, response.type);
                    return response;
                }

                // Klonujeme odpověď, protože ji potřebujeme pro cache i pro browser
                const responseToCache = response.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    // console.log('[ServiceWorker] Cachuji nově načtený soubor:', evt.request.url);
                    cache.put(evt.request, responseToCache);
                });

                return response; // Vrátíme originální odpověď prohlížeči
            }).catch(err => {
                 console.error('[ServiceWorker] Chyba při fetch a cachování:', evt.request.url, err);
                 // Zde bychom mohli vrátit nějakou fallback stránku/odpověď pro offline scénář
            });
        })
    );
});


// --- Background Sync Event ---
self.addEventListener('sync', (evt) => {
    if (evt.tag === 'sync-data') {
        console.log('[ServiceWorker] Zachycen Background Sync event: sync-data');
        evt.waitUntil(syncOfflineData());
    }
    // Zde mohou být další sync tagy pro jiné operace
});

// Funkce pro odeslání dat na server (volaná Background Syncem)
async function syncOfflineData() {
    console.log('[ServiceWorker] Pokouším se synchronizovat offline data...');
    try {
        // Přístup k IndexedDB nebo localStorage pro získání dat k odeslání
        // V tomto případě použijeme localStorage, i když pro SW je lepší IndexedDB
        // POZNÁMKA: Přímý přístup k localStorage ze SW nemusí být vždy spolehlivý.
        // Robustnější řešení by bylo ukládat data určená k synchronizaci do IndexedDB z hlavní aplikace.

        // Získání dat z "localStorage" pomocí clients API (asynchronní)
        const clientList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        let localDataString = null;

        if (clientList && clientList.length > 0) {
            // Zkusíme získat data z prvního klienta (okna/tabu)
             // Timeout pro případ, že by klient neodpověděl
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout při získávání dat z klienta")), 2000));
             try {
                 localDataString = await Promise.race([
                    new Promise(resolve => {
                        clientList[0].postMessage({ command: 'getLocalStorageData', key: 'workReportData' });

                        // Listener pro odpověď od klienta
                         const messageListener = (event) => {
                             if (event.data.command === 'localStorageDataResponse' && event.data.key === 'workReportData') {
                                 self.removeEventListener('message', messageListener); // Odstranit listener
                                 resolve(event.data.value);
                             }
                         };
                        self.addEventListener('message', messageListener);
                    }),
                    timeoutPromise
                 ]);
                 console.log("[ServiceWorker] Data úspěšně získána z klienta.");
             } catch(e) {
                  console.warn("[ServiceWorker] Nepodařilo se získat data z aktivního klienta:", e.message);
                  // Fallback: Pokud selže komunikace s klientem, pokusíme se data načíst přímo.
                  // Toto je méně spolehlivé, ale může fungovat v některých případech.
                  // Potřebujeme znát přesný klíč
                 // localDataString = localStorage.getItem('workReportData'); // Přímý přístup - MŮŽE SELHAT
             }

        } else {
            console.warn("[ServiceWorker] Žádný aktivní klient nenalezen pro získání dat.");
             // Fallback: Přímý přístup k localStorage (méně spolehlivé)
             // localDataString = localStorage.getItem('workReportData'); // MŮŽE SELHAT
        }


        if (!localDataString) {
            console.log('[ServiceWorker] Nebyla nalezena žádná lokální data k synchronizaci.');
            return; // Nic k synchronizaci
        }

        const localData = JSON.parse(localDataString);
        if (!localData) {
             console.log('[ServiceWorker] Lokální data jsou prázdná nebo neplatná.');
            return;
        }

        // !!! NAHRAĎTE SVOU FIREBASE URL !!!
        const firebaseDbUrl = 'https://VASE_DATABASE_URL.firebaseio.com/appData.json';

        console.log('[ServiceWorker] Odesílám data na:', firebaseDbUrl);

        const response = await fetch(firebaseDbUrl, {
            method: 'PUT', // POZOR: PUT přepíše všechna data na dané URL!
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(localData) // Odesíláme celý objekt appData
        });

        if (response.ok) {
            console.log('[ServiceWorker] Offline data úspěšně synchronizována s Firebase.');
             // Můžeme poslat zprávu zpět do aplikace, že synchronizace proběhla
             clientList.forEach(client => client.postMessage({ command: 'syncCompleted' }));
        } else {
            console.error('[ServiceWorker] Chyba při synchronizaci offline dat:', response.status, response.statusText);
             // Pokud selže, Background Sync to zkusí později znovu automaticky.
             // Můžeme zvážit logování chyby nebo upozornění uživatele.
            throw new Error(`Server response: ${response.status} ${response.statusText}`); // Vyhodíme chybu, aby sync manažer věděl, že má opakovat
        }

    } catch (error) {
        console.error('[ServiceWorker] Celková chyba při syncOfflineData:', error);
        // Zajistíme, že chyba je vyhozena, aby se sync mohl opakovat
        throw error;
    }
}

// --- Listener pro zprávy z hlavní aplikace ---
self.addEventListener('message', (event) => {
    // console.log("[ServiceWorker] Přijata zpráva z klienta:", event.data);
    if (event.data && event.data.command === 'getLocalStorageData') {
        const key = event.data.key;
         console.log(`[ServiceWorker] Klient požádal o data z localStorage, klíč: ${key}`);
         // POZOR: Přímý přístup k localStorage ze SW je riskantní.
         // Tento kód PŘEDPOKLÁDÁ, že SW má přístup, což nemusí být pravda.
         try {
            const value = localStorage.getItem(key);
            // Odeslání dat zpět klientovi, který poslal zprávu
            event.source.postMessage({ command: 'localStorageDataResponse', key: key, value: value });
         } catch (e) {
             console.error(`[ServiceWorker] Chyba při přímém přístupu k localStorage pro klíč ${key}:`, e);
             event.source.postMessage({ command: 'localStorageDataResponse', key: key, value: null, error: e.message });
         }
    }
});