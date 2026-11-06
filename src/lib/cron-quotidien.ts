import type { SupabaseClient } from '@supabase/supabase-js'
import { genererEcheances } from './echeances'
import { selectionnerRelances, construireMessage, libelleDossier, type DossierRelance } from './relances-auto'
import { joursAvantEcheance } from './penalites'
import { lireParametres } from './parametres'
import { emailConfigure, envoyerEmail } from './emailjs-server'
import { pushConfigure, envoyerPush } from './push-server'

export type Bilan = Record<string, number | string>
export type Cabinet = { id: string; nom: string; email_contact: string | null }

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** Génère les échéances de l'année pour les clients d'un cabinet (idempotent). */
export async function genererEcheancesCabinet(admin: SupabaseClient, cabinet: Cabinet, annee: number): Promise<number> {
  const { data: clients } = await admin.from('clients').select('id, regime_fiscal, collaborateur_id, cabinet_id').eq('cabinet_id', cabinet.id)
  if (!clients?.length) return 0
  const { data: existants } = await admin.from('dossiers_fiscaux').select('client_id, type_impot, periode_mois, periode_annee').eq('cabinet_id', cabinet.id).eq('periode_annee', annee)
  const aCreer = genererEcheances(clients, annee, existants ?? [])
  const lignes = aCreer.map(a => ({ ...a, cabinet_id: cabinet.id, statut: 'en_attente' }))
  for (let i = 0; i < lignes.length; i += 200) {
    const { error } = await admin.from('dossiers_fiscaux').insert(lignes.slice(i, i + 200))
    if (error) throw new Error(error.message)
  }
  if (lignes.length) await admin.from('audit_logs').insert({ cabinet_id: cabinet.id, action: 'GENERATION_ECHEANCES', details: `${lignes.length} échéance(s) générée(s) automatiquement pour ${annee}` })
  return lignes.length
}

const SELECT_DOSSIERS = 'id, cabinet_id, client_id, type_impot, periode_mois, periode_annee, date_echeance, statut, clients(raison_sociale, email_contact)'

export async function relancesAutomatiques(admin: SupabaseClient, cabinet: Cabinet, aujourdhui: Date): Promise<{ envoyees: number; echecs: number }> {
  if (!emailConfigure()) return { envoyees: 0, echecs: 0 }
  const { data: dossiers } = await admin.from('dossiers_fiscaux').select(SELECT_DOSSIERS).eq('cabinet_id', cabinet.id).eq('statut', 'en_attente')
  const liste = (dossiers ?? []) as unknown as DossierRelance[]
  const ids = liste.map(d => d.id)
  const { data: existantes } = ids.length
    ? await admin.from('relances').select('dossier_id, declencheur').in('dossier_id', ids).not('declencheur', 'is', null)
    : { data: [] }
  const aEnvoyer = selectionnerRelances(liste, existantes ?? [], aujourdhui)

  let envoyees = 0, echecs = 0
  for (const { dossier, declencheur } of aEnvoyer) {
    const { sujet, message } = construireMessage(dossier, declencheur, cabinet.nom)
    try {
      await envoyerEmail({ to: dossier.clients!.email_contact!, sujet, message, replyTo: cabinet.email_contact, expediteur: cabinet.nom })
      await admin.from('relances').insert({
        cabinet_id: cabinet.id, dossier_id: dossier.id, client_id: dossier.client_id, contenu_email: message,
        canal: 'email', statut: 'envoye', declencheur, auto: true,
      })
      await admin.from('audit_logs').insert({ cabinet_id: cabinet.id, action: 'RELANCE_AUTO', details: `${declencheur} : relance automatique à ${dossier.clients!.raison_sociale} (${libelleDossier(dossier)})` })
      envoyees++
    } catch (e) {
      echecs++
      await admin.from('audit_logs').insert({ cabinet_id: cabinet.id, action: 'RELANCE_AUTO_ECHEC', details: `${dossier.clients?.raison_sociale} : ${e instanceof Error ? e.message : 'erreur'}` })
    }
  }
  return { envoyees, echecs }
}

/** Le 1er du mois : récapitulatif des dossiers en attente envoyé à chaque client du cabinet. */
export async function recapitulatifsMensuels(admin: SupabaseClient, cabinet: Cabinet, aujourdhui: Date): Promise<number> {
  if (!emailConfigure()) return 0
  const { data: dossiers } = await admin.from('dossiers_fiscaux').select(SELECT_DOSSIERS).eq('cabinet_id', cabinet.id).eq('statut', 'en_attente').order('date_echeance', { ascending: true })
  const parClient = new Map<string, DossierRelance[]>()
  for (const d of (dossiers ?? []) as unknown as DossierRelance[]) {
    if (!d.clients?.email_contact) continue
    if (joursAvantEcheance(d.date_echeance, aujourdhui) > 45) continue
    parClient.set(d.client_id, [...(parClient.get(d.client_id) ?? []), d])
  }
  let n = 0
  for (const [, liste] of parClient) {
    const c = liste[0].clients!
    const lignes = liste.map(d => {
      const j = joursAvantEcheance(d.date_echeance, aujourdhui)
      const date = new Date(`${d.date_echeance}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' })
      return `- ${libelleDossier(d)} : échéance le ${date}${j < 0 ? ' (en retard)' : ''}`
    }).join('\n')
    const message = `Bonjour ${c.raison_sociale},\n\nVoici le point sur vos obligations fiscales en attente de documents :\n\n${lignes}\n\nMerci de nous transmettre les pièces correspondantes dès que possible.\n\nCordialement,\n${cabinet.nom}`
    try {
      await envoyerEmail({ to: c.email_contact!, sujet: 'Récapitulatif mensuel de vos échéances fiscales', message, replyTo: cabinet.email_contact, expediteur: cabinet.nom })
      n++
    } catch { /* un échec n'arrête pas les autres */ }
  }
  if (n) await admin.from('audit_logs').insert({ cabinet_id: cabinet.id, action: 'RECAP_MENSUEL', details: `${n} récapitulatif(s) client envoyé(s)` })
  return n
}

/** Notification push quotidienne pour les membres d'un cabinet : retards et échéances proches. */
export async function digestPush(admin: SupabaseClient, cabinet: Cabinet, aujourdhui: Date): Promise<number> {
  if (!pushConfigure()) return 0
  const { data: membres } = await admin.from('collaborateurs').select('id, role').eq('cabinet_id', cabinet.id)
  const ids = (membres ?? []).map(m => m.id as string)
  if (!ids.length) return 0
  const { data: subs } = await admin.from('push_subscriptions').select('user_id').in('user_id', ids)
  const abonnes = new Set((subs ?? []).map(s => s.user_id as string))
  if (!abonnes.size) return 0
  const { data: dossiers } = await admin
    .from('dossiers_fiscaux').select('id, date_echeance, statut, clients(collaborateur_id)')
    .eq('cabinet_id', cabinet.id).neq('statut', 'televerse_otr')

  let n = 0
  for (const p of membres ?? []) {
    if (!abonnes.has(p.id)) continue
    let retard = 0, urgent = 0
    for (const d of (dossiers ?? []) as unknown as { date_echeance: string; clients: { collaborateur_id: string | null } | null }[]) {
      if (p.role !== 'admin' && d.clients?.collaborateur_id !== p.id) continue
      const j = joursAvantEcheance(d.date_echeance, aujourdhui)
      if (j < 0) retard++
      else if (j <= 5) urgent++
    }
    if (!retard && !urgent) continue
    const parts = []
    if (retard) parts.push(`${retard} dossier(s) en retard`)
    if (urgent) parts.push(`${urgent} échéance(s) dans les 5 jours`)
    n += await envoyerPush(admin, p.id, { title: `${cabinet.nom} : point du jour`, body: parts.join(' · '), url: '/dashboard/dossiers' })
  }
  return n
}

export async function executerQuotidien(admin: SupabaseClient, aujourdhui = new Date()): Promise<Bilan> {
  const bilan: Bilan = { date: iso(aujourdhui), echeances_creees: 0, relances_envoyees: 0, relances_echecs: 0, recaps_envoyes: 0, push_envoyes: 0 }
  const premier = aujourdhui.getUTCDate() === 1
  const add = (k: string, n: number) => { bilan[k] = Number(bilan[k] ?? 0) + n }

  const { data: cabinets } = await admin.from('cabinets').select('id, nom, email_contact')
  bilan.cabinets = cabinets?.length ?? 0

  // Chaque cabinet est traité isolément : l'échec de l'un n'affecte pas les autres.
  for (const cabinet of (cabinets ?? []) as Cabinet[]) {
    const etape = async (nom: string, fn: () => Promise<void>) => {
      try { await fn() } catch (e) { bilan[`erreur_${cabinet.nom}_${nom}`] = e instanceof Error ? e.message : 'erreur' }
    }
    const params = await lireParametres(admin, cabinet.id)
    if (premier) await etape('echeances', async () => add('echeances_creees', await genererEcheancesCabinet(admin, cabinet, aujourdhui.getUTCFullYear())))
    if (params.relances_auto) await etape('relances', async () => { const r = await relancesAutomatiques(admin, cabinet, aujourdhui); add('relances_envoyees', r.envoyees); add('relances_echecs', r.echecs) })
    if (params.recap_mensuel && premier) await etape('recap', async () => add('recaps_envoyes', await recapitulatifsMensuels(admin, cabinet, aujourdhui)))
    if (params.push_digest) await etape('push', async () => add('push_envoyes', await digestPush(admin, cabinet, aujourdhui)))
  }

  try {
    const limite = new Date(aujourdhui.getTime() - 2 * 86_400_000).toISOString()
    await admin.from('api_usage').delete().lt('created_at', limite)
    const vieux = new Date(aujourdhui.getTime() - 90 * 86_400_000).toISOString()
    await admin.from('error_logs').delete().lt('created_at', vieux)
  } catch (e) { bilan.erreur_nettoyage = e instanceof Error ? e.message : 'erreur' }
  return bilan
}
