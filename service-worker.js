// --- Konfigurace Service Workera ---
const CACHE_NAME = 'pracovni-vykazy-cache-v1.2'; // Zvyšte verzi při změně cachovaných souborů
const DATA_CACHE_NAME = 'pracovni-vykazy-data-cache-v1'; // Cache pro API odpovědi (např. z Firebase)
const LOCAL_STORAGE_KEY = 'workReportData'; // Klíč pro data v localStorage
// !!! DŮLEŽITÉ: Nahraďte URL vaší Firebase databáze !!!
const FIREBASE_DB_URL_BASE = 'https://VASE_DATABASE_URL.firebaseio.com'; // Bez koncového .json

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
    // Případně přidejte cesty k fontům, pokud jsou oddělené (např. .woff2 soubory z FontAwesome CDN)
    // 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2'
];

// --- Pomocná funkce pro získání dat z localStorage přes klienta ---
// Poznámka: Toto je workaround, protože SW nemá přímý synchronní přístup k localStorage.
// Spoléhá na to, že alespoň jedno okno aplikace je otevřené.
async function getLocalStorageData(key) {
    const clientList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    if (!clientList || clientList.length === 0) {
        console.warn("[ServiceWorker] Nelze získat data z localStorage: Žádný aktivní klient.");
        // Alternativně zde můžete zkusit přímý (nespolehlivý) přístup: return localStorage.getItem(key);
        return null;
    }

    // Pošleme zprávu prvnímu nalezenému klientovi
    const client = clientList[0];
    const messageChannel = new MessageChannel();

    const dataPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout při čekání na odpověď od klienta ohledně localStorage.")), 2000); // 2s timeout

        messageChannel.port1.onmessage = (event) => {
            clearTimeout(timeout);
            if (event.data.error) {
                console.error("[ServiceWorker] Chyba při získávání dat z klienta:", event.data.error);
                reject(new Error(event.data.error));
            } else {
                // console.log("[ServiceWorker] Data z localStorage úspěšně přijata od klienta:", event.data.value);
                resolve(event.data.value);
            }
        };

        // Pošleme požadavek klientovi
        // console.log("[ServiceWorker] Posílám požadavek na localStorage data klientovi:", key);
        client.postMessage({ command: 'getLocalStorageData', key: key }, [messageChannel.port2]);
    });

    return dataPromise;
}


// --- Instalace Service Workera ---
self.addEventListener('install', (evt) => {
    console.log('[ServiceWorker] Instalace...');
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Cachování základních souborů aplikace...');
            // Použijeme addAll pro atomické cachování - selže, pokud některý soubor nelze načíst
            return cache.addAll(FILES_TO_CACHE);
        }).then(() => {
            console.log('[ServiceWorker] Základní soubory úspěšně nacachovány.');
        }).catch(err => {
            console.error('[ServiceWorker] Chyba při cachování základních souborů:', err);
            // Zde můžeme implementovat logiku pro případ selhání (např. neinstalovat SW)
        })
    );
    // Aktivuje nového SW ihned, jakmile je instalace dokončena (nečeká na zavření starých tabů)
    self.skipWaiting();
});

// --- Aktivace Service Workera ---
self.addEventListener('activate', (evt) => {
    console.log('[ServiceWorker] Aktivace...');
    // Odstranění starých verzí cache, aby se uvolnilo místo
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // Pokud název cache neodpovídá aktuálním názvům, smažeme ji
                if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                    console.log('[ServiceWorker] Odstraňování staré cache:', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => {
            console.log('[ServiceWorker] Staré cache vyčištěny.');
            // Převezme kontrolu nad všemi otevřenými stránkami, které spadají pod scope SW
            return self.clients.claim();
        }).then(() => {
            console.log('[ServiceWorker] Aktivace dokončena a SW převzal kontrolu.');
        }).catch(err => {
             console.error('[ServiceWorker] Chyba během aktivace:', err);
        })
    );
});

// --- Zachytávání Fetch požadavků ---
self.addEventListener('fetch', (evt) => {
    const requestUrl = new URL(evt.request.url);

    // Ignorujeme požadavky, které nejsou GET (např. POST, PUT na Firebase při synchronizaci)
    // Synchronizaci řešíme explicitně ve funkci syncOfflineData
    if (evt.request.method !== 'GET') {
        // console.log('[ServiceWorker] Ignoruji non-GET požadavek:', evt.request.method, requestUrl.pathname);
        return;
    }

    // Ignorujeme Chrome extension požadavky
    if (requestUrl.protocol === 'chrome-extension:') {
        return;
    }

    // Strategie pro API/Firebase požadavky (Network first, fallback to cache)
    // Cílíme na URL naší databáze
    if (requestUrl.origin === FIREBASE_DB_URL_BASE) {
        // console.log('[ServiceWorker] Zpracovávám Firebase GET požadavek (Network first):', requestUrl.pathname);
        evt.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return fetch(evt.request)
                    .then(networkResponse => {
                        // Pokud úspěšně načteno z networku, uložíme kopii do datové cache
                        if (networkResponse && networkResponse.ok) {
                           // console.log('[ServiceWorker] Cachuji úspěšnou Firebase odpověď:', requestUrl.pathname);
                            cache.put(evt.request, networkResponse.clone());
                        } else if (networkResponse) {
                            // I když odpověď není ok (např. 404), může být validní, nechceme ji cachovat jako úspěšnou
                             console.warn('[ServiceWorker] Firebase odpověď není OK:', networkResponse.status, networkResponse.statusText);
                        }
                        return networkResponse;
                    }).catch(async (err) => {
                        // Pokud network selže (jsme offline), zkusíme vrátit z datové cache
                        console.warn('[ServiceWorker] Network pro Firebase selhal, zkouším cache:', err.message);
                        const cachedResponse = await cache.match(evt.request);
                        if (cachedResponse) {
                            console.log('[ServiceWorker] Vracím Firebase data z cache:', requestUrl.pathname);
                            return cachedResponse;
                        } else {
                            console.log('[ServiceWorker] Firebase data nejsou ani v cache.');
                            // Můžeme vrátit generickou chybovou odpověď nebo nechat prohlížeč selhat
                             return new Response(JSON.stringify({ error: "Offline a data nejsou v cache" }), {
                                status: 503, // Service Unavailable
                                headers: { 'Content-Type': 'application/json' }
                             });
                        }
                    });
            })
        );
        return; // Ukončíme zpracování pro Firebase GET požadavky
    }

    // Strategie pro ostatní (aplikační) soubory (Cache first, fallback to network)
    // console.log('[ServiceWorker] Zpracovávám aplikační požadavek (Cache first):', requestUrl.pathname);
    evt.respondWith(
        caches.match(evt.request).then((cachedResponse) => {
            // Pokud je soubor v cache, vrátíme ho
            if (cachedResponse) {
                // console.log('[ServiceWorker] Vracím z cache:', requestUrl.pathname);
                return cachedResponse;
            }

            // Pokud není v cache, pokusíme se ho načíst z networku
            // console.log('[ServiceWorker] Není v cache, načítám z networku:', requestUrl.pathname);
            return fetch(evt.request).then((networkResponse) => {
                // Pokud se nepodařilo načíst nebo odpověď není validní, vrátíme ji tak jak je
                if (!networkResponse || !networkResponse.ok || networkResponse.type !== 'basic') {
                   /* console.warn(
                        '[ServiceWorker] Network odpověď není cachovatelná:',
                        requestUrl.pathname,
                        networkResponse ? networkResponse.status : 'No response',
                        networkResponse ? networkResponse.type : 'N/A'
                    );*/
                    return networkResponse;
                }

                // Odpověď je v pořádku, uložíme kopii do cache pro příště
                // Klonujeme odpověď, protože stream lze číst jen jednou
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                   // console.log('[ServiceWorker] Cachuji nově načtený soubor:', requestUrl.pathname);
                    cache.put(evt.request, responseToCache);
                });

                // Vrátíme originální odpověď prohlížeči
                return networkResponse;
            }).catch(err => {
                 console.error('[ServiceWorker] Chyba při fetch (pravděpodobně offline a není v cache):', requestUrl.pathname, err);
                 // Zde bychom mohli vrátit fallback HTML stránku pro offline
                 // return caches.match('/offline.html'); // Pokud máte offline.html soubor
                 // Nebo nechat prohlížeč zobrazit standardní offline chybu
            });
        })
    );
});


// --- Background Sync Event ---
self.addEventListener('sync', (evt) => {
    if (evt.tag === 'sync-data') {
        console.log('[ServiceWorker] Zachycen Background Sync tag: sync-data');
        evt.waitUntil(
            syncOfflineData().catch(err => {
                console.error("[ServiceWorker] Background sync selhal:", err);
                // Zde bychom mohli naplánovat opakování nebo logovat chybu
                // Background Sync API by mělo opakovat automaticky s exponenciálním backoffem
            })
        );
    }
    // Zde mohou být další sync tagy pro jiné typy offline operací
});

// Funkce pro odeslání dat na server (volaná Background Syncem)
async function syncOfflineData() {
    console.log('[ServiceWorker] Pokouším se synchronizovat offline data...');
    let localDataString = null;
    try {
        localDataString = await getLocalStorageData(LOCAL_STORAGE_KEY);
    } catch (error) {
         console.error('[ServiceWorker] Nepodařilo se získat data z localStorage pro synchronizaci:', error);
         // Pokud nemůžeme získat data, nemůžeme synchronizovat. Sync se zkusí znovu později.
         throw new Error("Nepodařilo se získat data pro synchronizaci."); // Vyhodíme chybu, aby sync manager věděl, že má opakovat
    }


    if (!localDataString) {
        console.log('[ServiceWorker] Nebyla nalezena žádná lokální data k synchronizaci v localStorage.');
        return; // Nic k synchronizaci, sync event je úspěšně dokončen
    }

    let localData;
    try {
        localData = JSON.parse(localDataString);
         if (!localData) throw new Error("Parsovaná data jsou null nebo neplatná.");
    } catch (error) {
         console.error('[ServiceWorker] Lokální data k synchronizaci jsou neplatná (nelze parsovat JSON):', error);
          // Pokud jsou data nečitelná, nemá smysl opakovat sync.
          // Měli bychom možná logovat chybu nebo upozornit uživatele.
         // Nevyhazujeme chybu, aby se sync neopakoval donekonečna s neplatnými daty.
         return;
    }


    // Cílová URL pro PUT operaci v Firebase (přepíše všechna data)
    const firebaseDbUrl = `${FIREBASE_DB_URL_BASE}/appData.json`;

    console.log(`[ServiceWorker] Odesílám data (${localDataString.length} bytes) na:`, firebaseDbUrl);

    try {
        const response = await fetch(firebaseDbUrl, {
            method: 'PUT', // POZOR: PUT přepíše všechna data na dané URL! Zvažte PATCH pro částečné aktualizace.
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            // Odešleme celý aktuální stav aplikace z localStorage
            // Zajistíme, že odesíláme validní JSON (i když localData je už objekt)
            body: JSON.stringify(localData)
        });

        if (response.ok) {
            const responseData = await response.json(); // Zpracujeme odpověď
            console.log('[ServiceWorker] Offline data úspěšně synchronizována s Firebase.', responseData);
             // Po úspěšné synchronizaci můžeme poslat zprávu zpět do otevřených oken aplikace
            const clientList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
             clientList.forEach(client => client.postMessage({ command: 'syncCompleted' }));

        } else {
            // Pokud server vrátí chybu (např. 4xx, 5xx)
            console.error('[ServiceWorker] Chyba při synchronizaci offline dat - Server odpověděl:', response.status, response.statusText);
            const errorBody = await response.text(); // Zkusíme získat tělo chyby
            console.error('[ServiceWorker] Tělo chybové odpovědi:', errorBody);
             // Vyhodíme chybu, aby Background Sync věděl, že má operaci opakovat
            throw new Error(`Server response: ${response.status} ${response.statusText}`);
        }

    } catch (error) {
        // Zachytí chyby sítě nebo chyby vyhozené výše
        console.error('[ServiceWorker] Selhání fetch operace při synchronizaci:', error);
        // Vyhodíme chybu, aby Background Sync věděl, že má operaci opakovat
        throw error;
    }
}

// --- Listener pro zprávy z hlavní aplikace (pro komunikaci, např. získání localStorage) ---
self.addEventListener('message', (event) => {
    // console.log("[ServiceWorker] Přijata zpráva z klienta:", event.data);

    // Odpověď na žádost o data z localStorage
    if (event.data && event.data.command === 'getLocalStorageData' && event.ports && event.ports[0]) {
        const key = event.data.key;
        const port = event.ports[0]; // Port pro odpověď
        // console.log(`[ServiceWorker] Klient požádal o data z localStorage, klíč: ${key}. Odpovídám přes MessageChannel.`);

         // POZOR: Přímý přístup k localStorage ze SW je nespolehlivý a může selhat.
         // Tento kód zde pouze ilustruje, jak by se odpovědělo, pokud by přístup fungoval.
         // Funkce getLocalStorageData výše používá spolehlivější metodu dotazu na klienta.
        try {
             // const value = localStorage.getItem(key); // Tento přímý přístup často selže v SW.
             // Místo toho bychom měli spoléhat na komunikaci s klientem, pokud je potřeba.
             // Pokud ale tento SW kód volá funkce getLocalStorageData, ta už komunikaci řeší.

             // Pokud jsme zde, znamená to, že volání nešlo přes getLocalStorageData a spoléháme na přímý přístup
             // Což je špatně. Měli bychom vrátit chybu nebo použít jiný mechanismus.
             console.warn("[ServiceWorker] Neočekávané přímé volání listeneru pro getLocalStorageData.");
             port.postMessage({ key: key, value: null, error: "Přímý přístup k localStorage v SW není podporován spolehlivě." });

        } catch (e) {
            console.error(`[ServiceWorker] Chyba při pokusu o přímý přístup k localStorage (klíč: ${key}):`, e);
            port.postMessage({ key: key, value: null, error: e.message });
        }
    }

     // Zde mohou být listenery pro další příkazy z aplikace (např. 'skipWaiting', 'triggerSync' atd.)
});
