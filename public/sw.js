const CACHE_NAME = 'suaps-planner-v1';
const STATIC_CACHE_NAME = 'suaps-static-v1';

// Fichiers à mettre en cache dès l'installation
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// URLs de l'API à mettre en cache
const API_CACHE_NAME = 'suaps-api-v1';
const API_URLS = [
  '/api/catalogues',
  '/api/activites'
];

// Installation du service worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installation en cours...');
  
  event.waitUntil(
    Promise.all([
      // Cache des assets statiques
      caches.open(STATIC_CACHE_NAME)
        .then(cache => {
          console.log('Service Worker: Cache des assets statiques');
          return cache.addAll(STATIC_ASSETS);
        }),
      
      // Forcer l'activation immédiate
      self.skipWaiting()
    ])
  );
});

// Activation du service worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activation en cours...');
  
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME && 
                cacheName !== API_CACHE_NAME) {
              console.log('Service Worker: Suppression ancien cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ])
  );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Stratégie pour les API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Stratégie pour les assets statiques
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // Stratégie par défaut: Network First avec fallback
  event.respondWith(handleDefault(request));
});

// Gestion des requêtes API: Network First avec cache fallback
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Essayer le réseau d'abord
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Mettre en cache si succès
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Service Worker: Réseau indisponible, utilisation du cache pour', request.url);
    
    // Fallback vers le cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si pas de cache, retourner une réponse d'erreur
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Données non disponibles hors ligne',
        offline: true 
      }),
      { 
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Gestion des assets statiques: Cache First
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Asset non disponible:', request.url);
    return new Response('Asset non disponible hors ligne', { status: 404 });
  }
}

// Gestion par défaut: Network First
async function handleDefault(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // En cas d'erreur réseau, servir la page principale depuis le cache
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match('/');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Application non disponible hors ligne', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Vérifier si c'est un asset statique
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/icons/') || 
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.ico') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.js');
}

// Gestion des messages
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
}); 