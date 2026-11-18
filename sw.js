const NOMBRE_CACHE = 'inspeccion-pwa-v1';

const ARCHIVOS_PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOMBRE_CACHE)
      .then((cache) => {
        return cache.addAll(ARCHIVOS_PRECACHE);
      })
      .then(() => {

        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => {
        return Promise.all(
          nombres
            .filter((nombre) => nombre !== NOMBRE_CACHE)
            .map((nombre) => caches.delete(nombre))
        );
      })
      .then(() => {

        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {

  if (event.request.method !== 'GET') {
    return;
  }
  if (new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((respuestaCache) => {
        if (respuestaCache) {
          return respuestaCache;
        }
        return fetch(event.request)
          .then((respuestaRed) => {
            if (respuestaRed && respuestaRed.status === 200 && respuestaRed.type === 'basic') {
              const copia = respuestaRed.clone();
              caches.open(NOMBRE_CACHE).then((cache) => {
                cache.put(event.request, copia);
              });
            }
            return respuestaRed;
          });
      })
      .catch(() => {

        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 503, statusText: 'Sin conexión' });
      })
  );
});
