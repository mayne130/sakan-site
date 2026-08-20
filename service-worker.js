// Sakan service worker — basic offline resilience.
// Caches the core app shell (HTML/CSS/JS) so a brief connection drop
// doesn't show a blank browser error page. This intentionally does NOT
// cache Firestore data or images — those always need a live connection
// since listings, chat, and photos change constantly.

const CACHE_NAME = 'sakan-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/i18n.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle simple GET requests for our own app shell files.
  // Everything else (Firestore, Cloudinary, EmailJS, etc.) goes straight
  // to the network, untouched — the app's real data should never be stale.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => caches.match('/index.html'));
    })
  );
});
