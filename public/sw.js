// Service worker do app: recebe as notificações de venda e abre o painel no toque.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let msg = {};
  try {
    msg = e.data ? e.data.json() : {};
  } catch {
    msg = { title: 'Nozyx', body: e.data?.text() || '' };
  }
  e.waitUntil(
    self.registration.showNotification(msg.title || 'Nozyx', {
      body: msg.body || '',
      icon: '/icon-192.png',
      badge: '/badge.png',
      tag: msg.tag,
      data: { url: msg.url || '/' },
      vibrate: [80, 40, 80],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.navigate(url).then((w) => (w || c).focus());
      return self.clients.openWindow(url);
    })
  );
});
