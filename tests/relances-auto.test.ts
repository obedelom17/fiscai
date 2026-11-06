import { describe, it, expect } from 'vitest'
import { declencheurDuJour, selectionnerRelances, construireMessage, type DossierRelance } from '@/lib/relances-auto'

const d = (s: string) => new Date(`${s}T07:00:00Z`)
const dossier = (id: string, ech: string, extra: Partial<DossierRelance> = {}): DossierRelance => ({
  id, client_id: 'c', type_impot: 'TVA', periode_mois: 3, periode_annee: 2026, date_echeance: ech, statut: 'en_attente',
  clients: { raison_sociale: 'ACME', email_contact: 'a@acme.tg' }, ...extra,
})

describe('relances automatiques', () => {
  it('déclencheurs selon la distance à l\'échéance', () => {
    expect(declencheurDuJour('2026-05-10', d('2026-05-03'))).toBe('J-7')
    expect(declencheurDuJour('2026-05-10', d('2026-05-06'))).toBe('J-7')
    expect(declencheurDuJour('2026-05-10', d('2026-05-07'))).toBe('J-3')
    expect(declencheurDuJour('2026-05-10', d('2026-05-09'))).toBe('J-3')
    expect(declencheurDuJour('2026-05-10', d('2026-05-11'))).toBe('J+1')
    expect(declencheurDuJour('2026-05-10', d('2026-05-01'))).toBeNull()
  })
  it('ne relance jamais les vieux retards', () => {
    expect(declencheurDuJour('2025-12-15', d('2026-05-01'))).toBeNull()
  })
  it('ignore les dossiers déjà reçus, sans email, ou déjà relancés', () => {
    const jour = d('2026-05-07')
    const liste = [
      dossier('1', '2026-05-10'),
      dossier('2', '2026-05-10', { statut: 'recu' }),
      dossier('3', '2026-05-10', { clients: { raison_sociale: 'X', email_contact: null } }),
      dossier('4', '2026-05-10'),
    ]
    const r = selectionnerRelances(liste, [{ dossier_id: '4', declencheur: 'J-3' }], jour)
    expect(r.map(x => x.dossier.id)).toEqual(['1'])
    expect(r[0].declencheur).toBe('J-3')
  })
  it('la signature utilise le nom du cabinet', () => {
    const m = construireMessage(dossier('1', '2026-05-10'), 'J-3', 'Cabinet Mensah')
    expect(m.message).toContain('Cabinet Mensah')
    expect(m.message).not.toContain('Experts Afrique Conseils')
  })
  it('message de retard mentionne les pénalités', () => {
    const m = construireMessage(dossier('1', '2026-05-10'), 'J+1')
    expect(m.message).toContain('pénalités')
    expect(m.message).toContain('10/05/2026')
  })
})
