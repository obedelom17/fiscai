const CACHE_NAME = 'fiscai-v1'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/dossiers',
  '/dashboard/clients',
  '/dashboard/calendrier',
  '/site.webmanifest',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/favicon-32x32.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les requêtes non-GET ou vers Supabase/Groq/EmailJS
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('groq.com') ||
    url.hostname.includes('emailjs.com') ||
    url.pathname.startsWith('/api/')
  ) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      }).catch(() => caches.match('/dashboard'))
    })
  )
})
