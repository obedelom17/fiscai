import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser },
  })),
}))

import { middleware, config } from './middleware'

function makeRequest(path: string, search = '') {
  return new NextRequest(`https://app.test${path}${search}`)
}

describe('middleware', () => {
  beforeEach(() => {
    getUser.mockReset()
    getUser.mockResolvedValue({ data: { user: null } })
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it.each([
    '/auth/callback',
    '/securite',
    '/securite/2fa',
    '/_next/static/chunk.js',
    '/favicon.ico',
    '/logo.png',
  ])('lets %s pass through without touching auth', async (path) => {
    const res = await middleware(makeRequest(path))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
    expect(getUser).not.toHaveBeenCalled()
  })

  it('redirects an unauthenticated user to /auth', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await middleware(makeRequest('/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.test/auth')
  })

  it('clears query params when redirecting to /auth', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await middleware(makeRequest('/dashboard', '?tab=clients'))
    expect(res.headers.get('location')).toBe('https://app.test/auth')
  })

  it('lets an unauthenticated user reach /auth itself', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await middleware(makeRequest('/auth'))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('redirects an authenticated user away from /auth to /dashboard', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await middleware(makeRequest('/auth'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://app.test/dashboard')
  })

  it('allows an authenticated user to stay on a protected page', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await middleware(makeRequest('/dashboard'))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('does not redirect an authenticated user on nested /auth paths', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await middleware(makeRequest('/auth/reset'))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('exports a matcher config', () => {
    expect(Array.isArray(config.matcher)).toBe(true)
    expect(config.matcher.length).toBeGreaterThan(0)
  })
})
