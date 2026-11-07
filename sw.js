/* Scribble Scuffle service worker — cache-first app shell, 100% offline. */
const CACHE = 'scuffle-v2';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/engine/core.js',
  './js/engine/events.js',
  './js/engine/renderer.js',
  './js/engine/pool.js',
  './js/engine/noise.js',
  './js/world/terrain.js',
  './js/world/water.js',
  './js/world/weather.js',
  './js/world/biomes.js',
  './js/world/props.js',
  './js/world/grass.js',
  './js/game/physics.js',
  './js/game/cloth.js',
  './js/game/character.js',
  './js/game/wardrobe.js',
  './js/game/weapons.js',
  './js/game/weaponArt.js',
  './js/game/building.js',
  './js/game/bots.js',
  './js/game/vfx.js',
  './js/game/projectiles.js',
  './js/game/audio.js',
  './js/game/match.js',
  './js/game/modes.js',
  './js/game/rules.js',
  './js/game/hud.js',
  './js/game/victory3d.js',
  './js/game/menu.js',
  './js/game/wardrobeScreen.js',
  './js/game/debug.js',
  './js/game/main.js',
  './fonts/PatrickHand-Regular.ttf',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit || caches.match('./index.html'));
    })
  );
});
