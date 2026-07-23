// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const getUser = vi.fn()
const single = vi.fn()

const supabase = {
  auth: { getUser },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single })),
    })),
  })),
}

vi.mock('@/lib/supabase', () => ({
  createClient: () => supabase,
}))

import { useRole } from './useRole'

describe('useRole', () => {
  beforeEach(() => {
    getUser.mockReset()
    single.mockReset()
    supabase.from.mockClear()
  })

  it('starts in a loading state', () => {
    getUser.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useRole())
    expect(result.current.loading).toBe(true)
    expect(result.current.role).toBeNull()
    expect(result.current.isAdmin).toBe(false)
  })

  it('stops loading with a null role when there is no user', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const { result } = renderHook(() => useRole())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('exposes isAdmin=true for an admin collaborateur', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    single.mockResolvedValue({ data: { role: 'admin' } })
    const { result } = renderHook(() => useRole())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBe('admin')
    expect(result.current.isAdmin).toBe(true)
  })

  it('defaults to the collaborateur role when none is returned', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    single.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useRole())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBe('collaborateur')
    expect(result.current.isAdmin).toBe(false)
  })
})
