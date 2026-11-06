import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifierCron } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TABLES = ['cabinets', 'operateurs', 'collaborateurs', 'clients', 'dossiers_fiscaux', 'documents', 'relances', 'modeles_relance', 'commentaires_dossiers', 'historique_statuts', 'audit_logs', 'parametres']
const BUCKET = 'sauvegardes'
const CONSERVER = 8 // sauvegardes hebdomadaires conservées

async function toutLire(admin: ReturnType<typeof createAdminClient>, table: string) {
  const out: unknown[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select('*').range(from, from + 999)
    if (error) throw new Error(`${table} : ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

/** Export JSON hebdomadaire des tables vers le bucket privé « sauvegardes ». Les fichiers PDF (Storage) ne sont pas inclus. */
export async function GET(req: NextRequest) {
  if (!verifierCron(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const admin = createAdminClient()
  const jour = new Date().toISOString().slice(0, 10)
  const resume: Record<string, number | string> = {}
  for (const t of TABLES) {
    try {
      const rows = await toutLire(admin, t)
      const { error } = await admin.storage.from(BUCKET).upload(`${jour}/${t}.json`, JSON.stringify(rows), { contentType: 'application/json', upsert: true })
      resume[t] = error ? `échec : ${error.message}` : rows.length
    } catch (e) {
      resume[t] = e instanceof Error ? e.message : 'erreur'
    }
  }
  // Rotation
  try {
    const { data: dossiers } = await admin.storage.from(BUCKET).list('', { limit: 200 })
    const jours = (dossiers ?? []).map(d => d.name).filter(n => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort()
    for (const vieux of jours.slice(0, Math.max(0, jours.length - CONSERVER))) {
      const { data: fichiers } = await admin.storage.from(BUCKET).list(vieux)
      if (fichiers?.length) await admin.storage.from(BUCKET).remove(fichiers.map(f => `${vieux}/${f.name}`))
    }
  } catch { /* rotation best-effort */ }
  const ok = Object.values(resume).every(v => typeof v === 'number')
  return NextResponse.json({ ok, jour, tables: resume }, { status: ok ? 200 : 207 })
}
