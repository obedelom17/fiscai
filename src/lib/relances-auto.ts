import { joursAvantEcheance } from './penalites'

export type Declencheur = 'J-7' | 'J-3' | 'J+1'

export type DossierRelance = {
  id: string
  cabinet_id?: string
  client_id: string
  type_impot: string
  periode_mois: number | null
  periode_annee: number
  date_echeance: string
  statut: string
  clients?: { raison_sociale: string; email_contact: string | null } | null
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/**
 * Déclencheur applicable aujourd'hui, ou null.
 * J-7 : échéance dans 4 à 7 jours. J-3 : dans 1 à 3 jours. J+1 : échue depuis 0 à 7 jours.
 * Les dossiers en retard de plus de 7 jours ne sont jamais relancés automatiquement.
 */
export function declencheurDuJour(dateEcheance: string, aujourdhui: Date = new Date()): Declencheur | null {
  const j = joursAvantEcheance(dateEcheance, aujourdhui)
  if (j >= 4 && j <= 7) return 'J-7'
  if (j >= 1 && j <= 3) return 'J-3'
  if (j <= 0 && j >= -7) return 'J+1'
  return null
}

export type RelanceExistante = { dossier_id: string; declencheur: string | null }

export function selectionnerRelances(
  dossiers: DossierRelance[],
  existantes: RelanceExistante[],
  aujourdhui: Date = new Date()
): { dossier: DossierRelance; declencheur: Declencheur }[] {
  const deja = new Set(existantes.filter(r => r.declencheur).map(r => `${r.dossier_id}|${r.declencheur}`))
  const out: { dossier: DossierRelance; declencheur: Declencheur }[] = []
  for (const d of dossiers) {
    if (d.statut !== 'en_attente') continue
    if (!d.clients?.email_contact) continue
    const dec = declencheurDuJour(d.date_echeance, aujourdhui)
    if (!dec || deja.has(`${d.id}|${dec}`)) continue
    out.push({ dossier: d, declencheur: dec })
  }
  return out
}

export function libelleDossier(d: Pick<DossierRelance, 'type_impot' | 'periode_mois' | 'periode_annee'>): string {
  if (d.type_impot === 'acompte' && d.periode_mois) return `${d.periode_mois === 1 ? '1er' : d.periode_mois + 'ème'} acompte ${d.periode_annee}`
  if (d.periode_mois) return `${d.type_impot} de ${MOIS[d.periode_mois - 1]} ${d.periode_annee}`
  return `${d.type_impot} ${d.periode_annee}`
}

export function construireMessage(d: DossierRelance, declencheur: Declencheur, cabinet = 'Votre cabinet'): { sujet: string; message: string } {
  const client = d.clients?.raison_sociale ?? 'Madame, Monsieur'
  const echeance = new Date(`${d.date_echeance}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' })
  const objet = libelleDossier(d)
  if (declencheur === 'J+1') {
    return {
      sujet: `Échéance dépassée : ${objet}`,
      message: `Bonjour ${client},\n\nL'échéance de votre déclaration ${objet} était fixée au ${echeance} et nous n'avons pas encore reçu les documents nécessaires.\n\nMerci de nous les transmettre dans les meilleurs délais afin de limiter les pénalités de retard.\n\nCordialement,\n${cabinet}`,
    }
  }
  const delai = declencheur === 'J-7' ? 'dans une semaine' : 'dans quelques jours'
  return {
    sujet: `Rappel d'échéance : ${objet}`,
    message: `Bonjour ${client},\n\nNous vous rappelons que votre déclaration ${objet} arrive à échéance ${delai}, le ${echeance}.\n\nMerci de nous transmettre les documents nécessaires dès que possible afin que nous puissions la préparer à temps.\n\nCordialement,\n${cabinet}`,
  }
}
