const CACHE_NAME = 'smartmedi-cache-v1';
const OFFLINE_URL = '/offline.html';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/styles/globals.css',
  '/styles/accessibility.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
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
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Helper function for retrying failed requests
async function retryRequest(request, retries = MAX_RETRIES) {
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryRequest(request, retries - 1);
    }
    throw error;
  }
}

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      retryRequest(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ 
              error: 'You are offline',
              message: 'Please check your connection and try again',
              retryAfter: 30 // seconds
            }),
            {
              status: 503,
              headers: { 
                'Content-Type': 'application/json',
                'Retry-After': '30'
              }
            }
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return retryRequest(event.request)
          .then((response) => {
            // Cache successful responses
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache)
                    .catch((error) => {
                      console.error('Cache update failed:', error);
                    });
                });
            }
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Offline', { 
              status: 503,
              headers: {
                'Content-Type': 'text/plain',
                'Retry-After': '30'
              }
            });
          });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url,
        timestamp: new Date().toISOString()
      },
      actions: [
        {
          action: 'open',
          title: 'Open'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ],
      requireInteraction: true,
      tag: data.tag || 'default',
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .catch((error) => {
          console.error('Notification display failed:', error);
        })
    );
  } catch (error) {
    console.error('Push event handling failed:', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
      .catch((error) => {
        console.error('Notification click handling failed:', error);
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-records') {
    event.waitUntil(syncRecords().catch((error) => {
      console.error('Background sync failed:', error);
      // Retry sync after a delay
      return new Promise(resolve => setTimeout(resolve, 5000))
        .then(() => syncRecords());
    }));
  }
});

async function syncRecords() {
  const db = await openDB();
  const offlineRecords = await db.getAll('offlineRecords');
  
  for (const record of offlineRecords) {
    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await db.delete('offlineRecords', record.id);
    } catch (error) {
      console.error('Record sync failed:', error);
      // Keep the record in the offline queue for retry
      throw error;
    }
  }
} 