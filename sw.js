// ✅ Service Worker com versionamento baseado em timestamp
const CACHE_VERSION = 'v' + new Date().getTime();
const CACHE_NAME = 'galeria-' + CACHE_VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest'
];

// ✅ Instalação com cache mais robusto
self.addEventListener('install', event => {
  console.log('[SW] Instalando versão:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log('[SW] Assets cacheados');
        return self.skipWaiting(); // ✅ Força ativação imediata
      })
      .catch(err => {
        console.error('[SW] Erro ao cachear assets:', err);
      })
  );
});

// ✅ Ativação com limpeza de caches antigos
self.addEventListener('activate', event => {
  console.log('[SW] Ativando versão:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('galeria-') && name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Removendo cache antigo:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Caches antigos removidos');
        return self.clients.claim(); // ✅ Assume controle imediato
      })
  );
});

// ✅ Fetch com estratégia Network First para HTML, Cache First para assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // ✅ Ignorar requests que não são do mesmo domínio
  if (url.origin !== location.origin) {
    return;
  }
  
  // ✅ Ignorar requests de API ou dados dinâmicos
  if (url.pathname.includes('/api/') || url.pathname.includes('indexedDB')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // ✅ Para HTML, sempre tenta network first
        if (event.request.destination === 'document') {
          return fetch(event.request)
            .then(networkResponse => {
              // ✅ Atualiza cache com nova versão
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              // ✅ Fallback para cache se offline
              return cachedResponse || new Response(
                '<html><body><h1>Offline</h1><p>Sem conexão</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
        }
        
        // ✅ Para outros assets, cache first
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // ✅ Se não está em cache, busca da rede
        return fetch(event.request)
          .then(networkResponse => {
            // ✅ Cachear apenas respostas válidas
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(err => {
            console.error('[SW] Erro ao buscar:', event.request.url, err);
            // ✅ Retorna resposta vazia em caso de erro
            return new Response('', { status: 404 });
          });
      })
  );
});

// ✅ Mensagem para forçar update do SW
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker carregado:', CACHE_VERSION);
