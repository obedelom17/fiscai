import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const exchangeCodeForSession = vi.fn()
const insert = vi.fn()

let queryResults: unknown[] = []

function makeQuery() {
  const q: Record<string, unknown> = {}
  const chain = () => q
  q.select = chain
  q.eq = chain
  q.order = chain
  q.single = chain
  q.insert = (...args: unknown[]) => {
    insert(...args)
    return q
  }
  q.then = (resolve: (v: unknown) => void) =>
    resolve(queryResults.length ? queryResults.shift() : {})
  return q
}

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { exchangeCodeForSession },
    from: () => makeQuery(),
  }),
}))

import { GET } from './route'

function req(query: string) {
  return new NextRequest(`https://app.test/auth/callback${query}`)
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset()
    insert.mockReset()
    queryResults = []
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it('redirects to /auth?error=no_code when no code is present', async () => {
    const res = await GET(req(''))
    expect(res.headers.get('location')).toBe('https://app.test/auth?error=no_code')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('redirects to /auth?error=exchange_failed when the exchange errors', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: new Error('x') })
    const res = await GET(req('?code=abc'))
    expect(res.headers.get('location')).toBe('https://app.test/auth?error=exchange_failed')
  })

  it('does not insert a profile when the collaborateur already exists', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    queryResults = [{ data: { id: 'u1' } }]
    const res = await GET(req('?code=abc'))
    expect(insert).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('https://app.test/dashboard')
  })

  it('creates the first collaborateur as admin and splits the full name', async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: 'u1',
          email: 'jane@doe.tg',
          user_metadata: { full_name: 'Jane Marie Doe', avatar_url: 'a.png' },
        },
      },
      error: null,
    })
    queryResults = [{ data: null }, { count: 0 }]
    await GET(req('?code=abc'))
    expect(insert).toHaveBeenCalledWith({
      id: 'u1',
      nom: 'Marie Doe',
      prenom: 'Jane',
      email: 'jane@doe.tg',
      role: 'admin',
      avatar_url: 'a.png',
    })
  })

  it('creates a subsequent collaborateur with the collaborateur role', async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: 'u2', email: 'bob@doe.tg', user_metadata: { name: 'Bob' } } },
      error: null,
    })
    queryResults = [{ data: null }, { count: 3 }]
    await GET(req('?code=abc'))
    const arg = insert.mock.calls[0][0]
    expect(arg.role).toBe('collaborateur')
    expect(arg.prenom).toBe('Bob')
    expect(arg.nom).toBe('')
    expect(arg.avatar_url).toBeNull()
  })

  it('honors the next query param on success', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    queryResults = [{ data: { id: 'u1' } }]
    const res = await GET(req('?code=abc&next=/dashboard/clients'))
    expect(res.headers.get('location')).toBe('https://app.test/dashboard/clients')
  })
})
