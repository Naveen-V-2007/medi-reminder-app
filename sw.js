const CACHE_NAME = 'medicare-v3';
const DB_NAME = 'MedicareDB';

// 1. Install & Activate
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// 2. The Background Engine
// This function runs independently of the website being open
async function checkReminders() {
    const db = await openDB();
    const meds = await getAllMeds(db);
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    meds.forEach(med => {
        const times = Object.values(med.schedule || {});
        if (times.includes(currentTime)) {
            // Unique tag ensures the same med doesn't beep twice in the same minute
            const notificationTag = `med-${med.id}-${currentTime}`;
            
            self.registration.showNotification(`💊 MediCare: ${med.patientName}`, {
                body: `Time to take ${med.medName} (${med.colour.name} tablet)`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [500, 110, 500, 110, 450],
                tag: notificationTag,
                requireInteraction: true,
                data: { medId: med.id }
            });
        }
    });
}

// 3. Database Helpers (Must use IndexedDB in SW)
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('medicines')) {
                db.createObjectStore('medicines', { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getAllMeds(db) {
    return new Promise((resolve) => {
        const transaction = db.transaction('medicines', 'readonly');
        const store = transaction.objectStore('medicines');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
    });
}

// 4. The Loop
// On Android, this interval only works if the "Battery Optimization" is disabled for the app
setInterval(checkReminders, 60000); 

// Handle notification clicks
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(clients.openWindow('/'));
});
