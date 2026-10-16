// Service worker : interface disponible hors ligne ; l'API n'est jamais mise en cache ici
// (les derniers prix sont conservés côté page dans localStorage).
const CACHE = 'berry-radar-v10';
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
  // Réseau d'abord (au plus 2,5 s), copie locale sinon. Quand le serveur gratuit est en veille,
  // l'hébergeur renvoie sa propre page d'attente : elle n'a pas notre en-tête X-App, elle n'est
  // donc ni affichée ni mise en cache, et l'app s'ouvre aussitôt depuis la copie locale.
  const ours = (res) => res && res.ok && res.headers.get('X-App') === 'berry-radar';
  const net = fetch(e.request).then((res) => {
    if (ours(res)) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request.mode === 'navigate' ? './' : e.request, copy));
    }
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  e.respondWith(
    (async () => {
      const cached = (await caches.match(e.request, { ignoreSearch: true })) || (e.request.mode === 'navigate' ? await caches.match('./') : undefined);
      if (!cached) return net;
      const res = await Promise.race([net.catch(() => null), new Promise((r) => setTimeout(() => r(null), 2500))]);
      return ours(res) ? res : cached;
    })()
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
