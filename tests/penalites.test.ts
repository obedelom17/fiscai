import { describe, it, expect } from 'vitest'
import { estimerPenalite, joursAvantEcheance, TAUX } from '@/lib/penalites'

const d = (s: string) => new Date(`${s}T10:00:00Z`)

describe('pénalités', () => {
  it('pas de pénalité avant l\'échéance ni le jour J', () => {
    expect(estimerPenalite(100000, '2026-05-10', d('2026-05-09'))).toBeNull()
    expect(estimerPenalite(100000, '2026-05-10', d('2026-05-10'))).toBeNull()
  })
  it('pas de pénalité sans montant', () => {
    expect(estimerPenalite(null, '2026-05-10', d('2026-06-10'))).toBeNull()
    expect(estimerPenalite(0, '2026-05-10', d('2026-06-10'))).toBeNull()
  })
  it('calcule majoration + intérêts par mois commencé', () => {
    const p = estimerPenalite(100000, '2026-05-10', d('2026-05-11'))!
    expect(p.joursRetard).toBe(1)
    expect(p.moisCommences).toBe(1)
    expect(p.total).toBe(Math.round(100000 * TAUX.majorationFixe) + Math.round(100000 * TAUX.interetMensuel))
    const q = estimerPenalite(100000, '2026-05-10', d('2026-06-20'))!
    expect(q.moisCommences).toBe(2)
  })
  it('jours avant échéance', () => {
    expect(joursAvantEcheance('2026-05-10', d('2026-05-03'))).toBe(7)
    expect(joursAvantEcheance('2026-05-10', d('2026-05-12'))).toBe(-2)
  })
})
