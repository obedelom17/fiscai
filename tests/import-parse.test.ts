import { describe, it, expect } from 'vitest'
import { parseCsv, validerClients, validerDossiers, parseDate, MODELE_CLIENTS, MODELE_DOSSIERS } from '@/lib/import-parse'

describe('import', () => {
  it('lit un CSV point-virgule avec guillemets', () => {
    const l = parseCsv('raison_sociale;nif\n"A; B";123\n')
    expect(l).toEqual([{ raison_sociale: 'A; B', nif: '123' }])
  })
  it('valide les modèles fournis', () => {
    expect(validerClients(parseCsv(MODELE_CLIENTS)).every(r => r.erreurs.length === 0)).toBe(true)
    expect(validerDossiers(parseCsv(MODELE_DOSSIERS)).every(r => r.erreurs.length === 0)).toBe(true)
  })
  it('signale les erreurs clients', () => {
    const r = validerClients(parseCsv('raison_sociale;nif;regime_fiscal;email\n;;bidon;pas-un-email\n'))
    expect(r[0].erreurs.length).toBe(4)
    expect(r[0].ligne).toBe(2)
  })
  it('accepte les libellés de régime', () => {
    const r = validerClients(parseCsv('raison_sociale;nif;regime_fiscal\nA;1;Réel avec TVA\n'))
    expect(r[0].valeur?.regime_fiscal).toBe('RR_TVA')
  })
  it('dates', () => {
    expect(parseDate('15/02/2026')).toBe('2026-02-15')
    expect(parseDate('2026-02-15')).toBe('2026-02-15')
    expect(parseDate('31/02/2026')).toBeNull()
  })
  it('dossiers : type, montant avec espaces et virgule', () => {
    const r = validerDossiers(parseCsv('nif;type_impot;periode_annee;date_echeance;montant\n1;tva;2026;15/02/2026;1 250,50\n'))
    expect(r[0].valeur?.type_impot).toBe('TVA')
    expect(r[0].valeur?.montant).toBe(1250.5)
  })
})
