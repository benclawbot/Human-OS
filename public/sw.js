const SHELL='human-os-shell-v3';
const ASSETS=['/','/index.html','/styles.css','/app.js','/manifest.webmanifest','/icons/icon-192.png','/assets/mountain-dawn.jpg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(SHELL).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 event.respondWith(fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(SHELL).then(c=>c.put(event.request,copy))}return r}).catch(()=>caches.match(event.request).then(r=>r||new Response('Offline',{status:503}))))
});
