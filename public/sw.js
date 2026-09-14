const BASE_URL = new URL('./', self.location.href);
const CACHE_PREFIX = `adocat-static-${BASE_URL.pathname}-`;
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const OFFLINE_PAGE = new URL('offline.html', BASE_URL).href;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) =>
                cache.addAll([OFFLINE_PAGE, new URL('icons/cat-mark.svg', BASE_URL).href]),
            ),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (
        event.request.method !== 'GET' ||
        url.origin !== self.location.origin ||
        !url.pathname.startsWith(BASE_URL.pathname)
    )
        return;
    const relativePath = url.pathname.slice(BASE_URL.pathname.length);
    if (relativePath === 'api' || relativePath.startsWith('api/')) return;
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(async () => {
                const cache = await caches.open(CACHE_NAME);
                return (await cache.match(OFFLINE_PAGE)) || Response.error();
            }),
        );
        return;
    }
    // Only public static files are cached; forms, API responses and session data are excluded.
    if (/^(assets|images|fonts|icons)\//.test(relativePath)) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cached = await cache.match(event.request);
                if (cached) return cached;
                const response = await fetch(event.request);
                if (response.ok && response.type === 'basic') {
                    event.waitUntil(cache.put(event.request, response.clone()));
                }
                return response;
            }),
        );
    }
});
