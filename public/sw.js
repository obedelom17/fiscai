// Ancien service worker de cache : remplacé par un nettoyeur.
// Il vide les caches existants puis se désinscrit, pour que les utilisateurs reçoivent toujours la dernière version.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const noms = await caches.keys()
    await Promise.all(noms.map((n) => caches.delete(n)))
    await self.registration.unregister()
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach((c) => c.navigate(c.url))
  })())
})
