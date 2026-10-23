'use client'

import { useCallback, useState } from 'react'

/**
 * Cache mémoire partagé pendant toute la session.
 * Quand on revient sur une page déjà visitée, ses données s'affichent
 * immédiatement et sont rafraîchies en arrière-plan (au lieu d'un écran de chargement).
 */
const store = new Map<string, unknown>()

export function hasCache(key: string) {
  return store.has(key)
}

export function clearCache() {
  store.clear()
}

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial))

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue(prev => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        store.set(key, resolved)
        return resolved
      })
    },
    [key]
  )

  return [value, set] as const
}
