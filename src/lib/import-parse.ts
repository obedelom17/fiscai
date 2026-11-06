/** Lecture et validation des fichiers d'import (CSV / lignes déjà extraites d'un Excel). */

export type Ligne = Record<string, string>

export function detecterSeparateur(entete: string): string {
  const cand = [';', ',', '\t']
  return cand.map(c => ({ c, n: entete.split(c).length })).sort((a, b) => b.n - a.n)[0].c
}

export function parseCsv(texte: string): Ligne[] {
  const t = texte.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const premiere = t.split('\n')[0] ?? ''
  const sep = detecterSeparateur(premiere)
  const rows: string[][] = []
  let cur: string[] = []
  let champ = ''
  let guillemets = false
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (guillemets) {
      if (ch === '"' && t[i + 1] === '"') { champ += '"'; i++ }
      else if (ch === '"') guillemets = false
      else champ += ch
    } else if (ch === '"') guillemets = true
    else if (ch === sep) { cur.push(champ); champ = '' }
    else if (ch === '\n') { cur.push(champ); rows.push(cur); cur = []; champ = '' }
    else champ += ch
  }
  if (champ !== '' || cur.length) { cur.push(champ); rows.push(cur) }
  return versLignes(rows)
}

export function versLignes(rows: string[][]): Ligne[] {
  const non_vides = rows.filter(r => r.some(c => String(c ?? '').trim() !== ''))
  if (non_vides.length < 2) return []
  const entetes = non_vides[0].map(h => normaliser(String(h ?? '')))
  return non_vides.slice(1).map(r => {
    const o: Ligne = {}
    entetes.forEach((h, i) => { if (h) o[h] = String(r[i] ?? '').trim() })
    return o
  })
}

export function normaliser(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

const REGIMES: Record<string, string> = {
  rr_tva: 'RR_TVA', reel_avec_tva: 'RR_TVA', reel_tva: 'RR_TVA',
  rr_stva: 'RR_STVA', reel_sans_tva: 'RR_STVA',
  tpu_f: 'TPU_F', tpu_forfaitaire: 'TPU_F',
  tpu_d: 'TPU_D', tpu_declaratif: 'TPU_D',
}

export type ClientImport = { raison_sociale: string; nif: string; regime_fiscal: string; secteur_activite: string; email_contact: string; telephone: string }
export type Resultat<T> = { ligne: number; valeur?: T; erreurs: string[] }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validerClients(lignes: Ligne[]): Resultat<ClientImport>[] {
  return lignes.map((l, i) => {
    const erreurs: string[] = []
    const raison = l.raison_sociale || l.nom || l.entreprise || ''
    if (!raison) erreurs.push('raison sociale manquante')
    const nif = l.nif || ''
    if (!nif) erreurs.push('NIF manquant')
    const regime = REGIMES[normaliser(l.regime_fiscal || l.regime || 'RR_TVA')]
    if (!regime) erreurs.push(`régime inconnu (${l.regime_fiscal || l.regime})`)
    const email = l.email_contact || l.email || ''
    if (email && !EMAIL.test(email)) erreurs.push('email invalide')
    return {
      ligne: i + 2,
      erreurs,
      valeur: erreurs.length ? undefined : {
        raison_sociale: raison, nif, regime_fiscal: regime, secteur_activite: l.secteur_activite || l.secteur || '', email_contact: email, telephone: l.telephone || '',
      },
    }
  })
}

const TYPES = ['TVA', 'IRPP', 'IS', 'acompte', 'Patente', 'Retenue Sur Loyer', "Droit d'Enregistrement", "Taxe d'Habitation", 'Taxe Fonciere Baties', 'Taxe Fonciere Non Baties']

export function normaliserType(brut: string): string | null {
  const n = normaliser(brut)
  return TYPES.find(t => normaliser(t) === n) ?? null
}

/** Accepte AAAA-MM-JJ ou JJ/MM/AAAA. */
export function parseDate(brut: string): string | null {
  const s = brut.trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  let y: number, mo: number, d: number
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3] }
  else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) { d = +m[1]; mo = +m[2]; y = +m[3] }
  else return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export type DossierImport = { client_ref: string; type_impot: string; periode_mois: number | null; periode_annee: number; date_echeance: string; montant: number | null }

export function validerDossiers(lignes: Ligne[]): Resultat<DossierImport>[] {
  return lignes.map((l, i) => {
    const erreurs: string[] = []
    const ref = l.nif || l.client || l.raison_sociale || ''
    if (!ref) erreurs.push('client (NIF ou raison sociale) manquant')
    const type = normaliserType(l.type_impot || l.type || '')
    if (!type) erreurs.push(`type d'impôt inconnu (${l.type_impot || l.type || ''})`)
    const annee = parseInt(l.periode_annee || l.annee || '', 10)
    if (!annee || annee < 2000 || annee > 2100) erreurs.push('année invalide')
    const moisBrut = l.periode_mois || l.mois || ''
    const mois = moisBrut ? parseInt(moisBrut, 10) : null
    if (mois !== null && (!(mois >= 1 && mois <= 12))) erreurs.push('mois invalide (1-12)')
    const ech = parseDate(l.date_echeance || l.echeance || '')
    if (!ech) erreurs.push('date d\'échéance invalide (JJ/MM/AAAA)')
    const mBrut = (l.montant || '').replace(/\s/g, '').replace(',', '.')
    const montant = mBrut ? Number(mBrut) : null
    if (mBrut && Number.isNaN(montant)) erreurs.push('montant invalide')
    return {
      ligne: i + 2,
      erreurs,
      valeur: erreurs.length ? undefined : { client_ref: ref, type_impot: type!, periode_mois: mois, periode_annee: annee, date_echeance: ech!, montant },
    }
  })
}

export const MODELE_CLIENTS = 'raison_sociale;nif;regime_fiscal;secteur_activite;email_contact;telephone\nSOCIETE EXEMPLE SARL;1001234567;RR_TVA;Commerce;contact@exemple.tg;90000000\n'
export const MODELE_DOSSIERS = 'nif;type_impot;periode_mois;periode_annee;date_echeance;montant\n1001234567;TVA;1;2026;15/02/2026;250000\n'
