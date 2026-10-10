// Service worker : interface disponible hors ligne ; l'API n'est jamais mise en cache ici
// (les derniers prix sont conservés côté page dans localStorage).
const CACHE = 'berry-radar-v5';
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'account.js', 'tracking.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/__/')) return;
  // Réseau d'abord, cache en secours.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Notifications push (alertes de prix envoyées par le serveur).
self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { body: e.data?.text() };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || 'Berry Radar', {
      body: d.body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: d.tag,
      renotify: !!d.tag,
      data: { url: d.url || './' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.location.href).href;
  e.waitUntil(self.clients.openWindow(url));
});
