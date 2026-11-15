/* ==========================================================================
   LifeTrack Service Worker — Complete & Unified
   ========================================================================== */

"use strict";

const CACHE_NAME = "lifetrack-cache-v1";
const APP_VERSION = "2.0.0";

// Files required for offline startup (Fixed script.js -> app.js)
const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/style.css",
    "/app.js",
    "/manifest.json"
];

/* ==========================
   INSTALL EVENT
   ========================== */
self.addEventListener("install", event => {
    console.log("LifeTrack Service Worker installing...");
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Activate immediately
    self.skipWaiting();
});

/* ==========================
   ACTIVATE EVENT (Unified)
   ========================== */
self.addEventListener("activate", event => {
    console.log("LifeTrack Service Worker activating & cleaning caches...");
    
    const OLD_CACHES = ["lifetrack-cache-v0"];

    event.waitUntil(
        Promise.all([
            // Claim clients immediately
            self.clients.claim(),
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

/* ==========================
   FETCH EVENT (Offline Strategy)
   ========================== */
self.addEventListener("fetch", event => {
    const request = event.request;

    // Only handle GET requests
    if (request.method !== "GET") {
        return;
    }

    event.respondWith(
        caches.match(request)
        .then(cachedResponse => {
            if (cachedResponse) {
                // Update cache in background
                fetch(request)
                .then(networkResponse => {
                    caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(request, networkResponse);
                    });
                })
                .catch(() => {});

                return cachedResponse;
            }

            // If not cached, get from network
            return fetch(request)
            .then(networkResponse => {
                return caches.open(CACHE_NAME)
                .then(cache => {
                    cache.put(request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // Offline fallback
                return caches.match("/index.html");
            });
        })
    );
});

/* ==========================
   BACKGROUND SYNC
   ========================== */
self.addEventListener("sync", event => {
    if (event.tag === "lifetrack-sync") {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    console.log("LifeTrack background sync running...");
    return Promise.resolve();
}

/* ==========================
   PUSH NOTIFICATION SYSTEM
   ========================== */
self.addEventListener("push", event => {
    let data = {
        title: "LifeTrack",
        body: "Stay consistent with your goals!"
    };

    if (event.data) {
        data = event.data.json();
    }

    const options = {
        body: data.body,
        icon: "/assets/icons/icon-192.png",
        badge: "/assets/icons/icon-72.png",
        vibrate: [100, 50, 100]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

/* ==========================
   NOTIFICATION CLICK
   ========================== */
self.addEventListener("notificationclick", event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow("/")
    );
});

console.log("LifeTrack Service Worker Loaded 🚀");
