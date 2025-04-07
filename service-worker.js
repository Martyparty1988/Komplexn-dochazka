const cacheName = 'v1';
const cacheAssets = [
    'index.html',
    'app.js',
    'style.css',
    'manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-b3/css/all.min.css'
    // Zde můžete přidat další statické soubory, jako jsou obrázky
];

// Instalace Service Worker
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(cacheName)
            .then(cache => {
                console.log('Service Worker: Caching Files');
                return cache.addAll(cacheAssets);
            })
            .catch(err => console.log('Service Worker: Error Caching Files', err))
    );
});

// Aktivace Service Worker
self.addEventListener('activate', e => {
    console.log('Service Worker: Activated');
    // Odstranění starých caches
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== cacheName) {
                        console.log('Service Worker: Clearing Old Cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch událost
self.addEventListener('fetch', e => {
    console.log('Service Worker: Fetching');
    e.respondWith(
        fetch(e.request)
            .catch(() => caches.match(e.request))
    );
});