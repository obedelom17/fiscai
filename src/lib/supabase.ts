import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build/SSR without env vars, return a dummy client guard
  if (!url || !key) {
    if (typeof window === 'undefined') {
      // Return a no-op proxy during build time
      return new Proxy({} as ReturnType<typeof createBrowserClient>, {
        get: () => new Proxy(() => ({ data: null, error: new Error('No env') }), {
          get: (target, prop) => {
            if (prop === 'then') return undefined
            return new Proxy(() => ({ data: null, error: null }), {
              get: (t, p) => {
                if (p === 'then') return undefined
                return () => ({ data: null, error: null })
              }
            })
          },
          apply: (target) => ({ data: null, error: null })
        })
      })
    }
  }

  if (typeof window === 'undefined') {
    return createBrowserClient(url!, key!)
  }
  if (!client) {
    client = createBrowserClient(url!, key!)
  }
  return client
}
