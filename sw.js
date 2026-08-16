/* 肖总的投研工作台 · Service Worker
 * - 缓存应用外壳（HTML/manifest/图标），支持离线打开
 * - 导航请求 network-first：始终拉取最新 HTML，破除浏览器陈旧缓存导致的空白
 * - 跨域实时行情/资讯（腾讯 gtimg、东方财富）走网络，不缓存，保证实时
 */
const CACHE = 'touyan-app-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);

  // 跨域实时数据（行情/资讯）：不缓存，直接走网络
  if (url.origin !== location.origin) return;

  // 导航（HTML 页面）：network-first，确保始终最新；失败回退缓存外壳
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (r) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
        return r;
      }).catch(function () {
        return caches.match(e.request).then(function (m) { return m || caches.match('./index.html'); });
      })
    );
    return;
  }

  // 同源静态资源：cache-first，再回源并更新
  e.respondWith(
    caches.match(e.request).then(function (m) {
      if (m) return m;
      return fetch(e.request).then(function (r) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
        return r;
      });
    })
  );
});
