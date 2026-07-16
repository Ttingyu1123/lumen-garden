/* ============================================================
   sw.js — Service Worker（PWA 離線支援）
   策略：stale-while-revalidate — 先回快取秒開，背景抓新版
   下次載入生效。改版不需要動這裡（背景更新會自己追上），
   只有想強制全員立刻換版時才把 CACHE 版號 +1。
   ============================================================ */

const CACHE = 'lumen-garden-v1';

const ASSETS = [
  './',
  './index.html',
  './manual.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/config.js',
  './js/state.js',
  './js/progress.js',
  './js/sfx.js',
  './js/grid.js',
  './js/resources.js',
  './js/perks.js',
  './js/projectiles.js',
  './js/units.js',
  './js/enemies.js',
  './js/waves.js',
  './js/ui.js',
  './js/render.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  evt.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fetching = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);   // 離線時退回快取
      return cached || fetching;
    })
  );
});
