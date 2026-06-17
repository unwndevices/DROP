// Self-destroying service worker — DO NOT REMOVE.
//
// DROP used to ship a Workbox PWA service worker (added in 7bd7ab2,
// removed in 804a818). Deleting it from source does NOT unregister it
// from browsers that already installed it: those returning visitors keep
// running the old worker, which serves the precached, months-old app
// shell cache-first on every load — including hard refresh — and never
// hits the network for navigations.
//
// The browser re-fetches THIS script (/DROP/sw.js) on its periodic
// service-worker update check, independently of the cached page. When it
// does, this worker takes over, purges every cache, unregisters itself,
// and reloads open tabs so the next load comes straight from the network.
//
// Keep this file deployed long-term so every straggler eventually gets
// unstuck. It is safe for new visitors — it never caches anything.

self.addEventListener('install', () => {
  // Activate immediately instead of waiting for existing tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop every cache the old Workbox worker created.
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // Remove this registration entirely.
      await self.registration.unregister();

      // Reload all controlled tabs so they fetch fresh from the network.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});
