import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { utilisateurCourant } from '@/lib/auth-server'
import { estimerPenalite, joursAvantEcheance } from '@/lib/penalites'
import { STATUT_LABELS, formatPeriode } from '@/lib/types'

export const dynamic = 'force-dynamic'

const VERT = 'FF1A3C2E'

type Ligne = {
  type_impot: string; periode_mois: number | null; periode_annee: number; date_echeance: string | null
  statut: string; montant: number | null; clients: { raison_sociale: string; nif: string } | null
}

function styleEntete(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT } }
  row.alignment = { vertical: 'middle' }
  row.height = 22
}

/** GET ?type=dossiers | rapport-mensuel &mois=AAAA-MM &clientId=… (le RLS limite aux dossiers autorisés) */
export async function GET(req: NextRequest) {
  const ctx = await utilisateurCourant()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const type = req.nextUrl.searchParams.get('type') === 'rapport-mensuel' ? 'rapport-mensuel' : 'dossiers'
  const clientId = req.nextUrl.searchParams.get('clientId')
  const mois = req.nextUrl.searchParams.get('mois') || new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(mois)) return NextResponse.json({ error: 'Mois invalide' }, { status: 400 })

  let q = ctx.supabase
    .from('dossiers_fiscaux')
    .select('type_impot, periode_mois, periode_annee, date_echeance, statut, montant, clients(raison_sociale, nif)')
    .order('date_echeance', { ascending: true })
  if (clientId) q = q.eq('client_id', clientId)
  if (type === 'rapport-mensuel') {
    const [a, m] = mois.split('-').map(Number)
    const fin = new Date(Date.UTC(a, m, 0)).getUTCDate()
    q = q.gte('date_echeance', `${mois}-01`).lte('date_echeance', `${mois}-${String(fin).padStart(2, '0')}`)
  }
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const lignes = (data ?? []) as unknown as Ligne[]

  const wb = new ExcelJS.Workbook()
  wb.creator = 'FiscAI'
  wb.created = new Date()
  const ws = wb.addWorksheet(type === 'rapport-mensuel' ? `Échéances ${mois}` : 'Dossiers')
  ws.columns = [
    { header: 'Client', key: 'client', width: 30 },
    { header: 'NIF', key: 'nif', width: 16 },
    { header: 'Type', key: 'type', width: 22 },
    { header: 'Période', key: 'periode', width: 16 },
    { header: 'Échéance', key: 'echeance', width: 14, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Statut', key: 'statut', width: 16 },
    { header: 'Montant (FCFA)', key: 'montant', width: 18, style: { numFmt: '#,##0' } },
    { header: 'Jours de retard', key: 'retard', width: 15 },
    { header: 'Pénalité estimée (FCFA)', key: 'penalite', width: 24, style: { numFmt: '#,##0' } },
  ]
  styleEntete(ws.getRow(1))
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const now = new Date()
  let totalMontant = 0, totalPenalite = 0
  for (const l of lignes) {
    const enRetard = l.statut !== 'televerse_otr' && l.date_echeance ? Math.max(0, -joursAvantEcheance(l.date_echeance, now)) : 0
    const pen = l.statut !== 'televerse_otr' ? estimerPenalite(l.montant, l.date_echeance, now) : null
    totalMontant += Number(l.montant ?? 0)
    totalPenalite += pen?.total ?? 0
    const row = ws.addRow({
      client: l.clients?.raison_sociale ?? '', nif: l.clients?.nif ?? '', type: l.type_impot,
      periode: formatPeriode(l.type_impot, l.periode_mois, l.periode_annee),
      echeance: l.date_echeance ? new Date(`${l.date_echeance}T00:00:00Z`) : null,
      statut: STATUT_LABELS[l.statut] ?? l.statut,
      montant: l.montant != null ? Number(l.montant) : null,
      retard: enRetard || null, penalite: pen?.total ?? null,
    })
    if (enRetard) row.getCell('retard').font = { color: { argb: 'FFDC2626' }, bold: true }
  }
  const total = ws.addRow({ client: 'TOTAL', montant: totalMontant, penalite: totalPenalite })
  total.font = { bold: true }
  ws.autoFilter = { from: 'A1', to: 'I1' }

  if (type === 'rapport-mensuel') {
    const rs = wb.addWorksheet('Synthèse par client')
    rs.columns = [
      { header: 'Client', key: 'client', width: 32 },
      { header: 'Dossiers', key: 'n', width: 12 },
      { header: 'Traités', key: 'traites', width: 12 },
      { header: 'En attente', key: 'attente', width: 14 },
      { header: 'Montant (FCFA)', key: 'montant', width: 18, style: { numFmt: '#,##0' } },
    ]
    styleEntete(rs.getRow(1))
    const parClient = new Map<string, { n: number; traites: number; attente: number; montant: number }>()
    for (const l of lignes) {
      const k = l.clients?.raison_sociale ?? 'Inconnu'
      const e = parClient.get(k) ?? { n: 0, traites: 0, attente: 0, montant: 0 }
      e.n++; e.montant += Number(l.montant ?? 0)
      if (l.statut === 'en_attente') e.attente++; else e.traites++
      parClient.set(k, e)
    }
    for (const [client, e] of [...parClient].sort((a, b) => a[0].localeCompare(b[0]))) rs.addRow({ client, ...e })
  }

  const buf = await wb.xlsx.writeBuffer()
  const nom = type === 'rapport-mensuel' ? `fiscai-rapport-${mois}.xlsx` : `fiscai-dossiers-${new Date().toISOString().slice(0, 10)}.xlsx`
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nom}"`,
      'Cache-Control': 'no-store',
    },
  })
}
