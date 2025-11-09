// Service Worker for Birthday Manager PWA
// Provides offline caching for read operations

const CACHE_NAME = 'birthday-manager-v1';
const STATIC_CACHE = 'birthday-manager-static-v1';
const API_CACHE = 'birthday-manager-api-v1';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/static/index.html',
    '/static/app.js',
    '/static/i18n.js',
    '/static/style.css',
    '/static/manifest.webmanifest'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // API requests - cache-first with network fallback
    if (url.pathname.startsWith('/api/')) {
        // Only cache GET requests for birthdays (read operations)
        if (url.pathname === '/api/birthdays' || url.pathname === '/api/birthdays/today') {
            event.respondWith(
                caches.open(API_CACHE).then((cache) => {
                    return cache.match(request).then((cachedResponse) => {
                        // Return cached if available and not too old (5 minutes)
                        if (cachedResponse) {
                            const cachedDate = cachedResponse.headers.get('sw-cached-date');
                            if (cachedDate) {
                                const age = Date.now() - parseInt(cachedDate);
                                if (age < 5 * 60 * 1000) { // 5 minutes
                                    return cachedResponse;
                                }
                            }
                        }
                        
                        // Fetch from network
                        return fetch(request)
                            .then((response) => {
                                // Clone response for caching
                                const responseToCache = response.clone();
                                const headers = new Headers(responseToCache.headers);
                                headers.set('sw-cached-date', Date.now().toString());
                                
                                const modifiedResponse = new Response(responseToCache.body, {
                                    status: responseToCache.status,
                                    statusText: responseToCache.statusText,
                                    headers: headers
                                });
                                
                                cache.put(request, modifiedResponse);
                                return response;
                            })
                            .catch(() => {
                                // Network failed, return cached if available
                                return cachedResponse || new Response(
                                    JSON.stringify({ error: 'Offline - using cached data' }),
                                    { headers: { 'Content-Type': 'application/json' } }
                                );
                            });
                    });
                })
            );
        } else {
            // Other API requests - network only
            event.respondWith(fetch(request));
        }
        return;
    }
    
    // Static assets - cache-first strategy
    if (url.pathname.startsWith('/static/') || url.pathname === '/') {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                return cachedResponse || fetch(request).then((response) => {
                    // Cache successful responses
                    if (response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }
    
    // Default: network first
    event.respondWith(fetch(request));
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-birthdays') {
        event.waitUntil(syncBirthdays());
    }
});

async function syncBirthdays() {
    // Future: sync pending operations when back online
    console.log('Syncing birthdays...');
}

