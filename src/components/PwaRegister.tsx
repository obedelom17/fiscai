'use client'
import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    // Désinstaller tous les service workers existants pour éviter les problèmes de cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(r => r.unregister())
      })
    }
  }, [])
  return null
}
