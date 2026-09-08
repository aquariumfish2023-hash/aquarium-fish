const CACHE='aquarium-fish-v11';
const ASSETS=[
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './splash-v7.png'
];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ASSETS))
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(
        keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
      )
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  e.respondWith(
    fetch(e.request).catch(()=>
      caches.match(e.request)
    )
  );
});
