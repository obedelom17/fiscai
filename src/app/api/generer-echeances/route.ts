import { NextRequest, NextResponse } from 'next/server'
import { utilisateurCourant } from '@/lib/auth-server'
import { genererEcheances } from '@/lib/echeances'

export const dynamic = 'force-dynamic'

/** POST { annee, dryRun? } : crée les échéances manquantes des clients visibles par l'utilisateur. */
export async function POST(req: NextRequest) {
  const ctx = await utilisateurCourant()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { supabase, user, role } = ctx

  const body = await req.json().catch(() => ({}))
  const annee = Number(body.annee)
  if (!annee || annee < 2000 || annee > 2100) return NextResponse.json({ error: 'Année invalide' }, { status: 400 })

  let q = supabase.from('clients').select('id, regime_fiscal, collaborateur_id')
  if (role !== 'admin') q = q.eq('collaborateur_id', user.id)
  const { data: clients, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (clients ?? []).map(c => c.id)
  if (!ids.length) return NextResponse.json({ crees: 0, clients: 0 })

  const { data: existants } = await supabase
    .from('dossiers_fiscaux')
    .select('client_id, type_impot, periode_mois, periode_annee')
    .in('client_id', ids)
    .eq('periode_annee', annee)

  const aCreer = genererEcheances(clients ?? [], annee, existants ?? [])
  if (body.dryRun) return NextResponse.json({ crees: aCreer.length, clients: ids.length, dryRun: true })

  const lignes = aCreer.map(a => ({ ...a, collaborateur_id: a.collaborateur_id ?? user.id, statut: 'en_attente' }))
  for (let i = 0; i < lignes.length; i += 200) {
    const { error: e } = await supabase.from('dossiers_fiscaux').insert(lignes.slice(i, i + 200))
    if (e) return NextResponse.json({ error: e.message, crees: i }, { status: 500 })
  }
  if (lignes.length) {
    await supabase.from('audit_logs').insert({ collaborateur_id: user.id, action: 'GENERATION_ECHEANCES', details: `${lignes.length} échéance(s) générée(s) pour ${annee}` })
  }
  return NextResponse.json({ crees: lignes.length, clients: ids.length })
}
