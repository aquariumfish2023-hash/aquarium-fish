const CACHE='aquarium-fish-v26';
const ASSETS=[
  './',
  './index.html',
  './style.css',
  './js/app-core.js',
  './js/app-inventario-reportes.js',
  './js/app-cotizaciones.js',
  './js/app-operacion.js',
  './js/app-caja-respaldos.js',
  './js/app-mejoras.js',
  './manifest.json',
  './icon.svg',
  './splash-v7.png',
  './aquarium-portada-wide.png',
  './aquarium-portada-mobile.png'
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
