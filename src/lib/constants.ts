// Domaine métier partagé — libellés, couleurs et listes réutilisés dans l'app.

export const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  recu: 'Reçu',
  valide: 'Validé',
  televerse_otr: 'Téléversé OTR',
}

// Classes Tailwind pour les badges de statut (tableaux, cartes).
export const STATUT_BADGE_CLASSES: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  recu: 'bg-blue-100 text-blue-700',
  valide: 'bg-green-100 text-green-700',
  televerse_otr: 'bg-purple-100 text-purple-700',
}

// Palette hexadécimale pour le calendrier (fond / texte / pastille).
export const STATUT_COULEURS: Record<string, { bg: string; text: string; dot: string }> = {
  en_attente: { bg: '#fef9c3', text: '#854d0e', dot: '#d97706' },
  recu: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  valide: { bg: '#dcfce7', text: '#166534', dot: '#2d6a4f' },
  televerse_otr: { bg: '#f3e8ff', text: '#6b21a8', dot: '#9333ea' },
}

export const REGIME_LABELS: Record<string, string> = {
  RR_TVA: 'Réel avec TVA',
  RR_STVA: 'Réel sans TVA',
  TPU_F: 'TPU Forfaitaire',
  TPU_D: 'TPU Déclaratif',
}

export const REGIME_COLORS: Record<string, string> = {
  RR_TVA: 'bg-blue-100 text-blue-700',
  RR_STVA: 'bg-purple-100 text-purple-700',
  TPU_F: 'bg-orange-100 text-orange-700',
  TPU_D: 'bg-green-100 text-green-700',
}

export const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export const TYPES_IMPOT = ['TVA', 'IRPP', 'IS', 'acompte']
