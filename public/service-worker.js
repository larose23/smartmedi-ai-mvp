const CACHE_NAME = 'smartmedi-v1';
const OFFLINE_URL = '/offline.html';

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/checkin',
        OFFLINE_URL,
        '/styles/main.css',
        '/scripts/main.js'
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - handle offline requests
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Store in IndexedDB for later sync
          return storeOfflineSubmission(event.request);
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              return response;
            })
            .catch(() => {
              if (event.request.mode === 'navigate') {
                return caches.match(OFFLINE_URL);
              }
            });
        })
    );
  }
});

// Store offline form submissions
async function storeOfflineSubmission(request) {
  const formData = await request.clone().formData();
  const submission = {
    url: request.url,
    method: request.method,
    formData: Object.fromEntries(formData),
    timestamp: new Date().toISOString()
  };

  const db = await openDB();
  await db.add('offlineSubmissions', submission);
  
  return new Response(JSON.stringify({ 
    status: 'queued',
    message: 'Form submission queued for offline sync'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SmartMediOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineSubmissions')) {
        db.createObjectStore('offlineSubmissions', { keyPath: 'timestamp' });
      }
    };
  });
} 