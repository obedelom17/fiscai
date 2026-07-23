import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getUser = vi.fn()
let tableResults: Record<string, unknown> = {}

function makeQuery(table: string) {
  const q: Record<string, unknown> = {}
  const chain = () => q
  q.select = chain
  q.eq = chain
  q.order = chain
  q.single = chain
  q.then = (resolve: (v: unknown) => void) => resolve(tableResults[table] ?? { data: null })
  return q
}

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser },
    from: (table: string) => makeQuery(table),
  }),
}))

import { GET } from './route'

function req(query: string) {
  return new NextRequest(`https://app.test/api/export-pdf${query}`)
}

describe('GET /api/export-pdf', () => {
  beforeEach(() => {
    getUser.mockReset()
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    tableResults = {}
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it('returns 401 without an authenticated user', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await GET(req('?client_id=1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when client_id is missing', async () => {
    const res = await GET(req(''))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'client_id requis' })
  })

  it('returns 404 when the client is not found', async () => {
    tableResults = { clients: { data: null } }
    const res = await GET(req('?client_id=1'))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Client non trouvé' })
  })

  it('renders an HTML bulletin with the client details and stats', async () => {
    tableResults = {
      clients: {
        data: {
          raison_sociale: 'Société Alpha',
          nif: 'NIF123',
          regime_fiscal: 'Réel',
          secteur_activite: 'Commerce',
          email_contact: 'contact@alpha.tg',
          telephone: '+228 90 00 00 00',
        },
      },
      dossiers_fiscaux: {
        data: [
          { type_impot: 'TVA', periode_mois: 3, periode_annee: 2024, date_echeance: '2024-04-15', statut: 'en_attente' },
          { type_impot: 'IRPP', periode_mois: null, periode_annee: 2024, date_echeance: '2024-05-15', statut: 'valide' },
          { type_impot: 'IS', periode_mois: 1, periode_annee: 2024, date_echeance: '2024-02-15', statut: 'televerse_otr' },
        ],
      },
      relances: {
        data: [
          { date_envoi: '2024-03-01', canal: 'whatsapp', statut: 'envoyé' },
          { date_envoi: '2024-03-02', canal: 'email', statut: 'envoyé' },
        ],
      },
    }

    const res = await GET(req('?client_id=1'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="bulletin-fiscal-Soci-t--Alpha.html"',
    )

    const html = await res.text()
    expect(html).toContain('Société Alpha')
    expect(html).toContain('NIF123')
    expect(html).toContain('En attente')
    expect(html).toContain('Validé')
    expect(html).toContain('Téléversé OTR')
    // "Traités" stat counts valide + televerse_otr = 2
    expect(html).toContain('>2</div>')
    expect(html).toContain('WhatsApp')
    // Mois label for periode_mois=3 (Mar)
    expect(html).toContain('Mar 2024')
    // relances section header present
    expect(html).toContain('Historique des relances')
  })

  it('renders empty-state text when there are no dossiers or relances', async () => {
    tableResults = {
      clients: { data: { raison_sociale: 'Beta' } },
      dossiers_fiscaux: { data: [] },
      relances: { data: [] },
    }
    const res = await GET(req('?client_id=2'))
    const html = await res.text()
    expect(html).toContain('Aucun dossier enregistré')
    expect(html).not.toContain('Historique des relances')
    // fallback dashes for missing optional client fields
    expect(html).toContain('—')
  })
})
