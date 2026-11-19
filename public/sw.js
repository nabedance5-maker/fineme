/**
 * Fineme Service Worker（2026-11-19 作り直し）
 *
 * 通知（Web Push）の受け取りと、通知を押した時にページを開くことだけを行う。
 * 通信の横取り・保存（キャッシュ）はしない。
 *
 * 経緯：2026-07-10 からサイトの CSP（worker-src blob:）でこのファイルの登録が止められていて、
 * マイページの通知の登録が動いていなかった。止められている間、サイトは「Service Worker なし」で動いていたので、
 * 作り直しでも通信には一切触らず、今の動きを変えない。
 * 旧版はログイン中の API の結果まで端末に保存していた（個人情報が端末に残る）ため、保存の仕組みは入れ直さない。
 * 旧版が残っている端末では、ここで古い保存を消す。
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('fineme-')).map(k => caches.delete(k))))
      .catch(() => {})
      .then(() => self.clients.claim())
  );
});

// fetch は扱わない（ブラウザがそのまま通信する）

// ---- Web Push 受信 ----
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

// ---- 通知を押した時：Fineme の中のページだけを開く ----
function safePath(u) {
  try {
    const url = new URL(String(u || '/'), self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search + url.hash : '/';
  } catch {
    return '/';
  }
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = safePath(event.notification.data?.url);
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(path) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(path);
    })
  );
});
