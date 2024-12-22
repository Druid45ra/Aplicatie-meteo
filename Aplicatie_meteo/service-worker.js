const CACHE_NAME = 'weather-app-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js@3.7.0/dist/chart.min.js'
];

// Install event - caching static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});

// Fetch event - serve from cache, then network
self.addEventListener('fetch', event => {
    // Handle API requests differently
    if (event.request.url.includes('api.openweathermap.org')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    
                    // Clone the response as it can only be consumed once
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            // Cache the response with a timeout of 15 minutes
                            const cacheData = {
                                response: responseToCache,
                                timestamp: Date.now()
                            };
                            cache.put(event.request, response);
                        });
                        
                    return response;
                })
                .catch(() => {
                    // If network fails, try to serve from cache
                    return caches.match(event.request);
                })
        );
    } else {
        // For non-API requests, try cache first, then network
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});

// Handle background sync for offline functionality
self.addEventListener('sync', event => {
    if (event.tag === 'sync-weather-data') {
        event.waitUntil(syncWeatherData());
    }
});

// Background sync function
async function syncWeatherData() {
    const offlineData = await getOfflineData();
    if (offlineData && offlineData.length > 0) {
        for (const data of offlineData) {
            try {
                await sendToServer(data);
                await removeFromOfflineData(data.id);
            } catch (error) {
                console.error('Sync failed:', error);
            }
        }
    }
}
