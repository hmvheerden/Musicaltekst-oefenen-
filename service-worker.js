const CACHE="musicaltekst-oefenen-v18";
const LOCAL=["./","./index.html","./style.css?v=8","./app.js?v=8","./parser.js?v=8","./manifest.json","./icon-192.png","./icon-512.png","./voorbeeldscript.txt"];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(LOCAL)).catch(()=>{}))});
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);
 const appAsset=url.origin===location.origin;
 if(appAsset){
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html"))));
 }else{
  event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return response})));
 }
});
