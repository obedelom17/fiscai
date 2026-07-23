import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getUser = vi.fn()
const create = vi.fn()

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser } }),
}))

vi.mock('groq-sdk', () => ({
  default: class {
    chat = { completions: { create } }
  },
}))

import { POST } from './route'

function postRequest(body: unknown) {
  return new NextRequest('https://app.test/api/assistant', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/assistant', () => {
  beforeEach(() => {
    getUser.mockReset()
    create.mockReset()
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    create.mockResolvedValue({ choices: [{ message: { content: 'Bonjour' } }] })
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.GROQ_API_KEY = 'groq-key'
  })

  it('returns 401 when there is no authenticated user', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(postRequest({ message: 'salut' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Non autorisé' })
    expect(create).not.toHaveBeenCalled()
  })

  it('returns 400 for an empty/whitespace message', async () => {
    const res = await POST(postRequest({ message: '   ' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Message vide' })
    expect(create).not.toHaveBeenCalled()
  })

  it('returns 400 for a missing message', async () => {
    const res = await POST(postRequest({}))
    expect(res.status).toBe(400)
  })

  it('sends system + history + new message to Groq and returns the reply', async () => {
    const res = await POST(
      postRequest({
        message: 'Quel est le statut ?',
        contexte: 'DONNEES_PORTEFEUILLE',
        historique: [
          { role: 'user', content: 'Bonjour' },
          { role: 'assistant', content: 'Bonjour, comment aider ?' },
        ],
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ reponse: 'Bonjour' })

    const args = create.mock.calls[0][0]
    expect(args.model).toBe('llama-3.1-8b-instant')
    const msgs = args.messages
    expect(msgs[0].role).toBe('system')
    expect(msgs[0].content).toContain('DONNEES_PORTEFEUILLE')
    expect(msgs[1]).toEqual({ role: 'user', content: 'Bonjour' })
    expect(msgs[2]).toEqual({ role: 'assistant', content: 'Bonjour, comment aider ?' })
    expect(msgs[3]).toEqual({ role: 'user', content: 'Quel est le statut ?' })
  })

  it('defaults to an empty history when none is provided', async () => {
    await POST(postRequest({ message: 'salut', contexte: '' }))
    const msgs = create.mock.calls[0][0].messages
    expect(msgs).toHaveLength(2)
    expect(msgs[1]).toEqual({ role: 'user', content: 'salut' })
  })

  it('returns 500 when the Groq call throws', async () => {
    create.mockRejectedValue(new Error('boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(postRequest({ message: 'salut' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Erreur assistant IA' })
    errSpy.mockRestore()
  })
})
