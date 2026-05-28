/**
 * BasketBest UK — Service Worker
 *
 * Strategy:
 *   - API calls  (/api/*) → NetworkFirst   (fresh data preferred, cache on fail)
 *   - Static assets      → CacheFirst      (fast loads, cache busted by filename hash)
 *   - HTML navigation    → NetworkFirst    (always try to get the latest shell)
 *
 * Cache name: basketbest-v1
 * Bump CACHE_NAME to invalidate all caches on next deploy.
 */

const CACHE_NAME = "basketbest-v1";
const STATIC_CACHE_NAME = "basketbest-static-v1";

/** Pages to precache on install */
const PRECACHE_URLS = ["/", "/basket", "/dashboard", "/index.html"];

/** Offline fallback HTML — shown when a navigation request fails with no cache hit */
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#16a34a" />
  <title>Offline — BasketBest UK</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f0fdf4;
      color: #1f2937;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100svh;
      padding: 1.5rem;
      text-align: center;
      gap: 1.25rem;
    }
    .icon {
      width: 5rem;
      height: 5rem;
      background: #dcfce7;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg { width: 2.5rem; height: 2.5rem; color: #16a34a; }
    h1 { font-size: 1.25rem; font-weight: 600; }
    p  { font-size: 0.9375rem; color: #6b7280; max-width: 22rem; line-height: 1.6; }
    .badge {
      background: #16a34a;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
    }
  </style>
</head>
<body>
  <div class="icon">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
         stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3
           3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684
           2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5
           14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0
           011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  </div>
  <h1>You're offline</h1>
  <p>BasketBest will sync when you reconnect — your basket is saved locally.</p>
  <span class="badge">BasketBest UK</span>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Install — precache shell routes
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ---------------------------------------------------------------------------
// Activate — delete stale caches, claim all clients
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  const allowedCaches = new Set([CACHE_NAME, STATIC_CACHE_NAME]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !allowedCaches.has(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Is this a navigation request (HTML page load)? */
function isNavigation(request) {
  return request.mode === "navigate";
}

/** Is this a call to our own API? */
function isApiCall(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith("/api/");
}

/** Is this a static asset (hashed filename from Vite build)? */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    /\.[0-9a-f]{8,}\.(js|css|woff2?|png|jpg|webp|svg|ico)$/.test(
      url.pathname,
    ) ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/screenshots/")
  );
}

// ---------------------------------------------------------------------------
// NetworkFirst — try network, fall back to cache, then offline page
// ---------------------------------------------------------------------------

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Only cache GET responses
      if (request.method === "GET") {
        cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // For navigation requests return the offline page
    if (isNavigation(request)) {
      return new Response(OFFLINE_HTML, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // For API calls return a structured error
    return new Response(
      JSON.stringify({ error: "offline", message: "You are currently offline" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// ---------------------------------------------------------------------------
// CacheFirst — return cache immediately, update in background
// ---------------------------------------------------------------------------

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in the background (stale-while-revalidate flavour)
    fetch(request)
      .then((res) => {
        if (res.ok) cache.put(request, res);
      })
      .catch(() => {
        /* ignore — we already served from cache */
      });
    return cached;
  }

  // Nothing cached — go to network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && request.method === "GET") {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response("Asset not available offline", { status: 503 });
  }
}

// ---------------------------------------------------------------------------
// Fetch — route to the right strategy
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET (and navigation) — let POST/PUT/DELETE pass through
  if (request.method !== "GET") return;

  // Cross-origin requests — let the browser handle them
  if (!request.url.startsWith(self.location.origin)) return;

  if (isApiCall(request)) {
    // API: NetworkFirst with runtime cache
    event.respondWith(networkFirst(request, CACHE_NAME));
  } else if (isStaticAsset(request)) {
    // Static assets: CacheFirst (Vite content-hashes bust on deploy)
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else {
    // HTML navigation and everything else: NetworkFirst
    event.respondWith(networkFirst(request, STATIC_CACHE_NAME));
  }
});
