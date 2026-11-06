/**
 * Estimation des pénalités de retard.
 *
 * ATTENTION : taux INDICATIFS par défaut, à faire valider par le cabinet
 * (Livre de procédures fiscales en vigueur). Affichés comme « estimation » dans l'application.
 */
export const TAUX = {
  /** Majoration appliquée une fois dès le premier jour de retard (part du montant dû). */
  majorationFixe: 0.1,
  /** Intérêt de retard par mois commencé (part du montant dû). */
  interetMensuel: 0.015,
}

export type Penalite = { joursRetard: number; moisCommences: number; majoration: number; interets: number; total: number }

const JOUR = 86400000

function utcMinuit(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Jours entre aujourd'hui et l'échéance (positif = avant l'échéance, négatif = en retard). */
export function joursAvantEcheance(dateEcheance: string | Date, aujourdhui: Date = new Date()): number {
  const e = typeof dateEcheance === 'string' ? new Date(dateEcheance.length === 10 ? `${dateEcheance}T00:00:00Z` : dateEcheance) : dateEcheance
  return Math.round((utcMinuit(e) - utcMinuit(aujourdhui)) / JOUR)
}

export function estimerPenalite(montant: number | null | undefined, dateEcheance: string | null | undefined, aujourdhui: Date = new Date()): Penalite | null {
  if (!montant || montant <= 0 || !dateEcheance) return null
  const jours = -joursAvantEcheance(dateEcheance, aujourdhui)
  if (jours <= 0) return null
  const mois = Math.ceil(jours / 30)
  const majoration = Math.round(montant * TAUX.majorationFixe)
  const interets = Math.round(montant * TAUX.interetMensuel * mois)
  return { joursRetard: jours, moisCommences: mois, majoration, interets, total: majoration + interets }
}

export const formatFcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`
