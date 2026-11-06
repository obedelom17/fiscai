/**
 * Génération automatique des échéances fiscales.
 *
 * IMPORTANT : les règles ci-dessous sont des valeurs PAR DÉFAUT. Elles doivent être
 * validées par le cabinet (calendrier fiscal OTR en vigueur) avant utilisation.
 * Tout se règle dans REGLES : aucun autre fichier à modifier.
 */
import { ACOMPTES, getAcompteEcheance } from './types'

export const REGLES = {
  /** TVA mensuelle : jour du mois suivant la période. */
  jourEcheanceTVA: 15,
  /** Impôt sur les sociétés : échéance de l'exercice N, l'année N+1. */
  echeanceIS: { mois: 4, jour: 30 },
}

export type ClientRegle = { id: string; regime_fiscal: string | null; collaborateur_id: string | null; cabinet_id?: string }

export type EcheanceAGenerer = {
  client_id: string
  collaborateur_id: string | null
  cabinet_id?: string
  type_impot: 'TVA' | 'IS' | 'acompte'
  periode_mois: number | null
  periode_annee: number
  date_echeance: string
}

export type DossierExistant = {
  client_id: string
  type_impot: string
  periode_mois: number | null
  periode_annee: number
}

const pad = (n: number) => String(n).padStart(2, '0')

export function cle(d: DossierExistant): string {
  return `${d.client_id}|${d.type_impot}|${d.periode_mois ?? 0}|${d.periode_annee}`
}

function dernierJour(annee: number, mois: number) {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate()
}

function dateIso(annee: number, mois: number, jour: number) {
  return `${annee}-${pad(mois)}-${pad(Math.min(jour, dernierJour(annee, mois)))}`
}

/** Échéance de la TVA du mois `mois` de l'année `annee`. */
export function echeanceTVA(annee: number, mois: number): string {
  const m = mois === 12 ? 1 : mois + 1
  const a = mois === 12 ? annee + 1 : annee
  return dateIso(a, m, REGLES.jourEcheanceTVA)
}

export function echeanceIS(annee: number): string {
  return dateIso(annee + 1, REGLES.echeanceIS.mois, REGLES.echeanceIS.jour)
}

/** Obligations attendues pour un client sur une année, selon son régime. */
export function obligationsClient(client: ClientRegle, annee: number): EcheanceAGenerer[] {
  const base = { client_id: client.id, collaborateur_id: client.collaborateur_id, periode_annee: annee, ...(client.cabinet_id ? { cabinet_id: client.cabinet_id } : {}) }
  const regime = client.regime_fiscal ?? ''
  const out: EcheanceAGenerer[] = []

  if (regime === 'RR_TVA') {
    for (let m = 1; m <= 12; m++) {
      out.push({ ...base, type_impot: 'TVA', periode_mois: m, date_echeance: echeanceTVA(annee, m) })
    }
  }
  if (regime === 'RR_TVA' || regime === 'RR_STVA') {
    for (const a of ACOMPTES) {
      out.push({ ...base, type_impot: 'acompte', periode_mois: a.numero, date_echeance: getAcompteEcheance(a.numero, annee) })
    }
    out.push({ ...base, type_impot: 'IS', periode_mois: null, date_echeance: echeanceIS(annee) })
  }
  // Régimes TPU : aucune obligation générée par défaut (à définir par le cabinet).
  return out
}

/** Liste des dossiers à créer (les doublons sont écartés). */
export function genererEcheances(
  clients: ClientRegle[],
  annee: number,
  existants: DossierExistant[]
): EcheanceAGenerer[] {
  const deja = new Set(existants.map(cle))
  const out: EcheanceAGenerer[] = []
  for (const c of clients) {
    for (const o of obligationsClient(c, annee)) {
      const k = cle(o)
      if (deja.has(k)) continue
      deja.add(k)
      out.push(o)
    }
  }
  return out
}
