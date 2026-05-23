const CACHE  = 'animeweb-v2';
const ASSETS = [
  '/anistream-site/',
  '/anistream-site/database.html',
  '/anistream-site/anime.html',
  '/anistream-site/watch.html',
  '/anistream-site/movies.html',
  '/anistream-site/browse.html',
  '/anistream-site/watchlist.html',
  '/anistream-site/app.js',
  '/anistream-site/style.css',
  '/anistream-site/logo.svg',
  // AnimeDb feeds this now,
];

// ── Install — cache static assets ─────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => {})) // silently skip 404s
      .then(() => self.skipWaiting())
  );
});

// ── Activate — clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch — cache-first for assets, network-first for APIs ───────────────────
const SKIP = ['graphql.anilist.co', 'api.jikan.moe', 'allorigins.win', 'google.com/s2'];

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (SKIP.some(s => e.request.url.includes(s))) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// ── Push — show episode notification ─────────────────────────────────────────
self.addEventListener('push', e => {
  const d = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(d.title || 'AnimeWeb', {
      body:    d.body  || 'New episode available!',
      icon:    '/anistream-site/logo.svg',
      badge:   '/anistream-site/logo.svg',
      tag:     d.tag   || 'animeweb-episode',
      renotify: true,
      data:    { url: d.url || '/anistream-site/database.html' },
      actions: [
        { action: 'watch', title: '▶ Watch Now' },
        { action: 'dismiss', title: 'Dismiss'  },
      ],
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || '/anistream-site/database.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const match = wins.find(w => w.url.includes('anistream-site'));
      if (match) { match.focus(); match.navigate(url); }
      else clients.openWindow(url);
    })
  );
});

// ── Message — trigger notification from page ──────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'NOTIFY') {
    const d = e.data;
    self.registration.showNotification(d.title, {
      body:  d.body,
      icon:  '/anistream-site/logo.svg',
      badge: '/anistream-site/logo.svg',
      tag:   d.tag || 'animeweb',
      data:  { url: d.url || '/anistream-site/database.html' },
      actions: [{ action: 'watch', title: '▶ Watch Now' }],
    });
  }
});
