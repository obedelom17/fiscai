// Types partagés entre toutes les pages

export type Role = 'admin' | 'collaborateur'
export type StatutDossier = 'en_attente' | 'recu' | 'valide' | 'televerse_otr'
export type TypeImpot = 'TVA' | 'IRPP' | 'IS' | 'acompte'
export type CanalRelance = 'email' | 'whatsapp'
export type StatutPaiement = 'non_facture' | 'facture' | 'partiellement_paye' | 'paye'

export const STATUT_PAIEMENT_LABELS: Record<StatutPaiement, string> = {
  non_facture: 'Non facturé',
  facture: 'Facturé',
  partiellement_paye: 'Partiellement payé',
  paye: 'Payé',
}

export const STATUT_PAIEMENT_COULEURS: Record<StatutPaiement, string> = {
  non_facture: 'bg-gray-100 text-gray-600',
  facture: 'bg-blue-100 text-blue-700',
  partiellement_paye: 'bg-yellow-100 text-yellow-700',
  paye: 'bg-green-100 text-green-700',
}

export const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  recu: 'Reçu',
  valide: 'Validé',
  televerse_otr: 'Téléversé OTR',
}

export const STATUT_COULEURS: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  recu: 'bg-blue-100 text-blue-800',
  valide: 'bg-green-100 text-green-700',
  televerse_otr: 'bg-purple-100 text-purple-800',
}

export const STATUT_HEX: Record<string, string> = {
  en_attente: '#d97706',
  recu: '#3b82f6',
  valide: '#2d6a4f',
  televerse_otr: '#8b5cf6',
}

export const ACOMPTES = [
  { numero: 1, label: '1er acompte', mois: 1, jour: 31, description: '31 janvier' },
  { numero: 2, label: '2ème acompte', mois: 5, jour: 31, description: '31 mai' },
  { numero: 3, label: '3ème acompte', mois: 7, jour: 31, description: '31 juillet' },
  { numero: 4, label: '4ème acompte', mois: 10, jour: 31, description: '31 octobre' },
] as const

export function getAcompteEcheance(numero: number, annee: number): string {
  const a = ACOMPTES.find(a => a.numero === numero)
  if (!a) return ''
  const lastDay = new Date(annee, a.mois, 0).getDate()
  const jour = Math.min(a.jour, lastDay)
  return `${annee}-${String(a.mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
}

export function formatPeriode(typeImpot: string, periodeMois: number | null, periodeAnnee: number): string {
  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  if (typeImpot === 'acompte' && periodeMois) {
    return `${ACOMPTES[periodeMois - 1]?.label ?? periodeMois + 'e'} ${periodeAnnee}`
  }
  if (periodeMois) return `${MOIS[periodeMois - 1]} ${periodeAnnee}`
  return String(periodeAnnee)
}

export type Collaborateur = {
  id: string
  nom: string
  prenom: string
  email: string
  role: Role
  avatar_url: string | null
}

export type Client = {
  id: string
  raison_sociale: string
  nif: string
  email: string
  telephone: string
  secteur_activite: string
  regime_fiscal: string
  collaborateur_id: string
}

export type DossierFiscal = {
  id: string
  client_id: string
  type_impot: TypeImpot
  statut: StatutDossier
  date_echeance: string
  date_depot: string | null
  periode_mois: number | null
  periode_annee: number
  collaborateur_id: string
  // Facturation
  honoraires: number
  decaissements: number
  montant_recu: number
  statut_paiement: StatutPaiement
  date_facturation: string | null
  date_paiement: string | null
  notes_facturation: string | null
  clients?: { raison_sociale: string; email?: string; telephone?: string }
  collaborateurs?: { nom: string; prenom: string } | null
}

export type Document = {
  id: string
  dossier_id: string
  nom_fichier: string
  url_stockage: string
  type_document: string
  created_at: string
}

export type Relance = {
  id: string
  dossier_id: string
  client_id: string
  contenu_email: string
  statut: string
  canal: CanalRelance
  date_envoi: string
  clients?: { raison_sociale: string }
  dossiers_fiscaux?: { type_impot: string; periode_annee: number }
}

export type AuditLog = {
  id: string
  action: string
  details: string
  created_at: string
  collaborateurs: { nom: string; prenom: string } | null
}
