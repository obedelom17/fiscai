import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createBrowserClient = vi.fn((..._args: unknown[]) => ({ id: Symbol('client') }))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: (...args: unknown[]) => createBrowserClient(...args),
}))

describe('createClient', () => {
  beforeEach(() => {
    vi.resetModules()
    createBrowserClient.mockClear()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('passes the public env vars to createBrowserClient', async () => {
    const { createClient } = await import('./supabase')
    createClient()
    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
    )
  })

  it('creates a fresh client on every call when running server-side (no window)', async () => {
    vi.stubGlobal('window', undefined)
    const { createClient } = await import('./supabase')
    createClient()
    createClient()
    expect(createBrowserClient).toHaveBeenCalledTimes(2)
  })

  it('memoizes a single client in the browser (window defined)', async () => {
    vi.stubGlobal('window', {} as Window & typeof globalThis)
    const { createClient } = await import('./supabase')
    const first = createClient()
    const second = createClient()
    expect(createBrowserClient).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
  })
})
