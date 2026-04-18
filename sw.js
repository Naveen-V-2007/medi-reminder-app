// MediCare Service Worker — Offline + Background Notifications
const CACHE = 'medicare-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

// ── INSTALL: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: serve from cache, fallback to network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    })).catch(() => caches.match('/index.html'))
  );
});

// ── BACKGROUND SYNC: check reminders every minute
self.addEventListener('periodicsync', e => {
  if (e.tag === 'medicine-check') {
    e.waitUntil(checkMedicines());
  }
});

// ── PUSH: receive push from server (future Firebase integration)
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || '💊 Medicine Reminder', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      data: data
    })
  );
});

// ── NOTIFICATION CLICK
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const speakText = e.notification.data?.speak;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) {
        const win = list[0];
        win.focus();
        if (speakText) win.postMessage({ type: 'SPEAK', text: speakText });
        return;
      }
      // App not open — open it, wait for load, then speak
      return clients.openWindow('/').then(win => {
        if (win && speakText) {
          setTimeout(() => win.postMessage({ type: 'SPEAK', text: speakText }), 2500);
        }
      });
    })
  );
});

// ── CHECK MEDICINES (called by periodic sync or message)
async function checkMedicines() {
  const data = await getStoredData();
  if (!data) return;

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${hh}:${mm}`;

  for (const med of data.medicines) {
    // Check schedule
    for (const [slot, time] of Object.entries(med.schedule || {})) {
      if (time === currentTime) {
        const speakText = `${med.patientName}, take your ${med.medName} — ${med.colour?.name || ''} tablet — now`;
        await self.registration.showNotification('💊 Medicine Reminder', {
          body: speakText,
          icon: '/icon-192.png',
          vibrate: [300, 100, 300, 100, 300],
          requireInteraction: true,
          tag: `med_${med.id}_${currentTime}`,
          data: { speak: speakText }
        });
      }
    }

    // Check low stock
    if (med.stock <= 3) {
      const alertKey = `stock_alerted_${med.id}_${now.toDateString()}`;
      const alerted = await getFlag(alertKey);
      if (!alerted) {
        const speakText = `${med.patientName}, please refill ${med.medName}. Only ${med.stock} tablet(s) left!`;
        await self.registration.showNotification('⚠ Low Stock Alert', {
          body: speakText,
          icon: '/icon-192.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          tag: `stock_${med.id}`,
          data: { speak: speakText }
        });
        await setFlag(alertKey);
      }
    }
  }
}

// ── SIMPLE KV via CacheStorage for flags
async function getFlag(key) {
  try {
    const c = await caches.open('medicare-flags');
    const r = await c.match('/' + key);
    return !!r;
  } catch { return false; }
}
async function setFlag(key) {
  try {
    const c = await caches.open('medicare-flags');
    await c.put('/' + key, new Response('1'));
  } catch {}
}

// ── READ localStorage via client message
async function getStoredData() {
  const clientList = await clients.matchAll({ includeUncontrolled: true });
  if (clientList.length === 0) return null;
  return new Promise(resolve => {
    const ch = new MessageChannel();
    ch.port1.onmessage = e => resolve(e.data);
    clientList[0].postMessage({ type: 'GET_DATA' }, [ch.port2]);
    setTimeout(() => resolve(null), 2000);
  });
}

// ── RECEIVE MESSAGES from page
self.addEventListener('message', e => {
  if (e.data?.type === 'CHECK_NOW') checkMedicines();
});

// ── PERIODIC ALARM via setTimeout loop (fallback when no PeriodicSync)
// This runs as long as SW is alive
function startInternalClock() {
  setInterval(() => checkMedicines(), 60000);
}
startInternalClock();
