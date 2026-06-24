const CACHE_NAME = "studyult-vault-v1";
const DATA_URLS = ["/vault-data.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete old cache versions
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      // Enforce max cache entries (50)
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      const MAX_ENTRIES = 50;
      if (keys.length > MAX_ENTRIES) {
        await Promise.all(keys.slice(0, keys.length - MAX_ENTRIES).map((r) => cache.delete(r)));
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin === self.location.origin && DATA_URLS.includes(url.pathname)) {
    event.respondWith(cacheThenNetwork(event.request));
    return;
  }

  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/api/") &&
    event.request.method === "GET"
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

async function cacheThenNetwork(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetchAndCache(request).catch(() => {});
    return cached;
  }
  return fetchAndCache(request);
}

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (response.ok) {
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
  }
  return response;
}
