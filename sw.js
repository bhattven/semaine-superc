/* Service worker — coquille hors ligne + contenu toujours frais.
   BUMP SHELL_VERSION dès qu'un fichier de la coquille change
   (index.html, styles.css, app.js, manifest, icônes).
   Les fichiers data/*.json n'ont PAS besoin d'un bump : ils sont servis
   en réseau-d'abord et se mettent à jour tout seuls. */

var SHELL_VERSION = "v2";
var SHELL_CACHE = "fm-shell-" + SHELL_VERSION;
var DATA_CACHE = "fm-data";
var FONT_CACHE = "fm-fonts";

var SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (c) { return c.addAll(SHELL_ASSETS); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL_CACHE && k !== DATA_CACHE && k !== FONT_CACHE) {
          return caches.delete(k);
        }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

/* Marque une réponse venue du cache, pour que l'app puisse l'afficher. */
function tagCached(response) {
  if (!response) return response;
  return response.blob().then(function (body) {
    var headers = new Headers();
    response.headers.forEach(function (v, k) { headers.set(k, v); });
    headers.set("X-FM-Cached", "1");
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  });
}

function networkFirst(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return fetch(request).then(function (res) {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    }).catch(function () {
      return cache.match(request).then(function (hit) {
        if (hit) return tagCached(hit);
        return new Response('{"error":"offline"}', {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      });
    });
  });
}

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (hit) {
      var fresh = fetch(request).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || fresh;
    });
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);

  // Polices Google : cache-first, pour que l'app garde son allure hors ligne.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Contenu : réseau d'abord, cache en filet.
  if (url.pathname.indexOf("/data/") !== -1) {
    event.respondWith(networkFirst(req, DATA_CACHE));
    return;
  }

  // Navigation : réseau d'abord, coquille en cache si hors ligne.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(function () { return caches.match("./index.html"); })
    );
    return;
  }

  // Reste de la coquille : cache d'abord, rafraîchi en arrière-plan.
  event.respondWith(cacheFirst(req, SHELL_CACHE));
});
