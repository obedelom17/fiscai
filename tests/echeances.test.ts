import { describe, it, expect } from 'vitest'
import { genererEcheances, echeanceTVA, echeanceIS, obligationsClient } from '@/lib/echeances'

const client = (id: string, regime: string) => ({ id, regime_fiscal: regime, collaborateur_id: 'c1' })

describe('échéances', () => {
  it('TVA de décembre tombe en janvier N+1', () => {
    expect(echeanceTVA(2026, 12)).toBe('2027-01-15')
    expect(echeanceTVA(2026, 1)).toBe('2026-02-15')
  })
  it('IS de l\'exercice N en avril N+1', () => {
    expect(echeanceIS(2026)).toBe('2027-04-30')
  })
  it('régime réel avec TVA : 12 TVA + 4 acomptes + 1 IS', () => {
    const o = obligationsClient(client('a', 'RR_TVA'), 2026)
    expect(o.filter(x => x.type_impot === 'TVA')).toHaveLength(12)
    expect(o.filter(x => x.type_impot === 'acompte')).toHaveLength(4)
    expect(o.filter(x => x.type_impot === 'IS')).toHaveLength(1)
  })
  it('réel sans TVA : pas de TVA', () => {
    const o = obligationsClient(client('a', 'RR_STVA'), 2026)
    expect(o.some(x => x.type_impot === 'TVA')).toBe(false)
    expect(o).toHaveLength(5)
  })
  it('TPU : rien par défaut', () => {
    expect(obligationsClient(client('a', 'TPU_F'), 2026)).toHaveLength(0)
  })
  it('écarte les doublons', () => {
    const existants = [{ client_id: 'a', type_impot: 'TVA', periode_mois: 1, periode_annee: 2026 }]
    const out = genererEcheances([client('a', 'RR_TVA')], 2026, existants)
    expect(out).toHaveLength(16)
    expect(out.some(x => x.type_impot === 'TVA' && x.periode_mois === 1)).toBe(false)
  })
  it('propage le cabinet du client aux échéances générées', () => {
    const out = genererEcheances([{ id: 'a', regime_fiscal: 'RR_STVA', collaborateur_id: null, cabinet_id: 'cab-1' }], 2026, [])
    expect(out.every(o => o.cabinet_id === 'cab-1')).toBe(true)
  })
  it('est idempotent', () => {
    const premiere = genererEcheances([client('a', 'RR_TVA')], 2026, [])
    const existants = premiere.map(p => ({ client_id: p.client_id, type_impot: p.type_impot, periode_mois: p.periode_mois, periode_annee: p.periode_annee }))
    expect(genererEcheances([client('a', 'RR_TVA')], 2026, existants)).toHaveLength(0)
  })
})
