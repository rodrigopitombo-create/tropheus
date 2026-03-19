const CACHE_NAME = 'tropheus-checklist-v1';

const ASSETS = [
  './TROPHEUS_Checklist_Visita_Tablet_6.html',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg'
];

// Install: pré-cache todos os assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Cache-first para assets locais, Network-first para APIs externas
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Requisições de API (Anthropic, ClickUp, Google) sempre vão para a rede
  const isExternalAPI =
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('clickup.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('googleapis.com');

  if (isExternalAPI) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para recursos locais: Cache-first com fallback para rede
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cacheia respostas válidas de origem same-origin
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Mensagem para forçar atualização do cache
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
