/**
 * Fineme Service Worker
 * 戦略:
 * - Shell (HTML/CSS/JS/fonts): Cache First → オフラインでも基本画面を表示
 * - APIリクエスト (localhost:3001): Network First → 失敗時はキャッシュ
 * - 画像: Stale While Revalidate → 高速表示 + バックグラウンド更新
 */
const CACHE_NAME = 'fineme-v7';
const SHELL_URLS = [
  '/',
  '/search',
  '/diagnosis',
  '/mypage/navi',
  '/mypage/log',
];

// ---- インストール: Shellをキャッシュ ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_URLS).catch(err => {
        console.warn('[SW] Shell pre-cache failed (some assets may not exist yet):', err);
      });
    })
  );
  self.skipWaiting();
});

// ---- アクティベート: 古いキャッシュ削除 ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---- フェッチ: リクエスト種別ごとに戦略を選択 ----
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // APIリクエスト → Network First
  if (url.hostname === 'localhost' || url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // HTML ドキュメント → Network First（常に最新を返す、オフライン時はキャッシュ）
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 画像 → Stale While Revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // /_next/static/ 配下はコンテンツハッシュ付きファイル名（内容が変わればURLも変わる）
  // なのでCache Firstで問題ない。それ以外（App RouterのRSCペイロード取得など、
  // destinationが'document'でもハッシュ付きURLでもない中間fetch）を同じ扱いにすると、
  // 一度キャッシュした古いページの中身がデプロイ後も永久に返り続けるバグになる
  // （でお報告2026-09-18「更新しても直ってない」系の一部はこれが原因と判明）。
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // その他（CSS/JS/fonts含む、非ハッシュURL）→ Network First
  event.respondWith(networkFirst(request));
});

// ---- Web Push受信 ----
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { title: 'Fineme', body: event.data.text() }; }

  const title = payload.title || 'Fineme';
  const options = {
    body: payload.body || '',
    icon: '/assets/images/icon-192.png',
    badge: '/assets/images/icon-192.png',
    data: { url: payload.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ---- 通知タップ ----
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ---- 戦略実装 ----
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // オフライン時フォールバック（HTMLリクエストのみ）
    if (request.destination === 'document') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    return new Response('オフラインです。ネットワーク接続を確認してください。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || networkFetch;
}
