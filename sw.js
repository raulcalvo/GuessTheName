const CACHE = "como-se-llamara-v13";
const ARCHIVOS = [
  "./",
  "index.html",
  "css/estilos.css",
  "js/app.js",
  "js/almacen.js",
  "js/firebase-config.js",
  "js/i18n.js",
  "js/respuestas.es.js",
  "js/respuestas.ca.js",
  "js/respuestas.en.js",
  "assets/sorpresa.bin",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero (para que los cambios lleguen enseguida), caché si no hay conexión.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Firebase y demás servicios externos van directos a la red (salvo las fuentes y el SDK).
  const url = new URL(e.request.url);
  const cacheable = url.origin === self.location.origin
    || /^(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com)$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp.ok || resp.type === "opaque") {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
