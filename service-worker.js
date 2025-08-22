// service-worker.js

self.addEventListener('install', event => {
  // Minimal install event
  // TODO: Add caching for offline support if needed
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Minimal activate event
  self.clients.claim();
});

// No fetch handler (no offline caching yet) 