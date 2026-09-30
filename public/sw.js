// 缓存名带版本号：升版后 activate 会清掉旧版本缓存（历史遗留的旧 HTML/资源不会残留）
const CACHE_NAME = 'fztbucs-v2';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
];

const RUNTIME_CACHE = 'fztbucs-runtime-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return;
  }

  // 页面导航（HTML 文档）：网络优先 —— cache-first 会让部署后的用户继续拿到旧 HTML，
  // 其中引用的旧 chunk hash 已不存在，表现为加载变慢/白屏（Lighthouse 冷启动亦受影响）。
  // 仅在离线（网络失败）时回退到缓存。
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || new Response('离线模式', { status: 503 })),
        ),
    );
    return;
  }

  // 其余 GET（图片等静态资源）：缓存优先 + 后台更新，保持既有行为
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => undefined);

      return cached || fetchPromise.then((r) => r || new Response('离线模式', { status: 503 }));
    }),
  );
});