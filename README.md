# MediCare – Medicine Reminder PWA

## Features
- Add patient name, medicine name, colour, doses, stock
- Morning / Afternoon / Evening / Night schedule with time picker
- Caretaker name, phone, email
- Dashboard with stats, low stock alerts, medicine table
- Dark mode
- Fully offline (Service Worker + localStorage)
- Lock screen notifications + voice alert (Web Speech API)
- Sound alert (Web Audio API)
- Low stock alert (< 3 tablets) — voice + notification
- Installable as Android APK via PWABuilder

## Run Locally
```bash
# Option 1 — Python
python3 -m http.server 8080
# Open: http://localhost:8080

# Option 2 — Node
npx serve .
```

> IMPORTANT: Must be served over HTTP/HTTPS (not file://) for Service Worker and Notifications to work.

## Deploy Free (for PWABuilder APK)
1. Push this folder to GitHub
2. Enable GitHub Pages (Settings → Pages → Deploy from main)
3. Your URL: https://yourusername.github.io/medicine-reminder

## Convert to APK
1. Go to https://pwabuilder.com
2. Enter your deployed URL
3. Click "Package for Stores" → Android → Download APK
4. Install on phone: allow "Install unknown apps" in settings

## Notification Behaviour
| Situation | Works? |
|---|---|
| App open | ✅ Voice + sound + notification |
| App minimized / phone locked | ✅ Notification shown |
| App completely killed | ⚠ Service Worker may still fire (Android dependent) |
| With Firebase FCM (future) | ✅ 100% guaranteed even when killed |

## Add Icons
Place these files in the same folder:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

Use any medicine or pill icon.

## Future: Firebase Cloud Notifications
To guarantee notifications even when app is killed:
1. Create Firebase project
2. Add `firebase-messaging-sw.js`
3. Store FCM tokens in Firestore
4. Use Cloud Functions to trigger alerts

## Tech Stack
- HTML + CSS + Vanilla JS
- localStorage (offline data)
- Service Worker (offline + background)
- Web Notifications API (lock screen)
- Web Speech API (voice alerts)
- Web Audio API (sound)
- PWABuilder (APK conversion)
