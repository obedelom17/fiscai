'use client'
import { useEffect } from 'react'

/**
 * Nettoie les anciens service workers de cache (qui servaient des pages périmées).
 * Le worker des notifications (/push-sw.js) est conservé.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => {
        const url = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || ''
        if (!url.endsWith('/push-sw.js')) r.unregister()
      })
    })
    if ('caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k)))
  }, [])
  return null
}
