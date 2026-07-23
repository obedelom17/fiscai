import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = {
  getAll: vi.fn(() => [{ name: 'sb', value: 'token' }]),
  set: vi.fn(),
}
const cookies = vi.fn(async () => cookieStore)
const createServerClient = vi.fn((..._args: unknown[]) => ({ id: 'server-client' }))

vi.mock('next/headers', () => ({
  cookies: () => cookies(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}))

import { createServerSupabase } from './supabase-server'

describe('createServerSupabase', () => {
  beforeEach(() => {
    createServerClient.mockClear()
    cookieStore.set.mockClear()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it('creates a server client with the public env vars', async () => {
    await createServerSupabase()
    expect(createServerClient).toHaveBeenCalledTimes(1)
    const [url, key] = createServerClient.mock.calls[0] as unknown[]
    expect(url).toBe('https://example.supabase.co')
    expect(key).toBe('anon-key')
  })

  it('wires getAll() to the cookie store', async () => {
    await createServerSupabase()
    const [, , options] = createServerClient.mock.calls[0] as unknown as [
      string,
      string,
      { cookies: { getAll: () => unknown; setAll: (c: unknown[]) => void } },
    ]
    expect(options.cookies.getAll()).toEqual([{ name: 'sb', value: 'token' }])
  })

  it('wires setAll() to write each cookie to the store', async () => {
    await createServerSupabase()
    const [, , options] = createServerClient.mock.calls[0] as unknown as [
      string,
      string,
      { cookies: { setAll: (c: unknown[]) => void } },
    ]
    options.cookies.setAll([
      { name: 'a', value: '1', options: { path: '/' } },
      { name: 'b', value: '2', options: {} },
    ])
    expect(cookieStore.set).toHaveBeenCalledTimes(2)
    expect(cookieStore.set).toHaveBeenCalledWith('a', '1', { path: '/' })
    expect(cookieStore.set).toHaveBeenCalledWith('b', '2', {})
  })
})
