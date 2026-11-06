import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import { LogoMark } from '@/components/Logo'
import { STATUT_LABELS, STATUT_HEX, formatPeriode } from '@/lib/types'
import { joursAvantEcheance } from '@/lib/penalites'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Suivi de vos dossiers fiscaux', robots: { index: false, follow: false } }

type Dossier = { id: string; type_impot: string; periode_mois: number | null; periode_annee: number; date_echeance: string | null; statut: string }

export default async function PortailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound()

  const admin = createAdminClient()
  const { data: client } = await admin
    .from('clients').select('id, raison_sociale, cabinet_id').eq('portail_token', token).eq('portail_actif', true).maybeSingle()
  if (!client) notFound()

  const { data: cab } = await admin.from('cabinets').select('nom').eq('id', client.cabinet_id).maybeSingle()
  const { data } = await admin
    .from('dossiers_fiscaux')
    .select('id, type_impot, periode_mois, periode_annee, date_echeance, statut')
    .eq('client_id', client.id)
    .order('date_echeance', { ascending: false })
    .limit(200)
  const dossiers = (data ?? []) as Dossier[]
  const now = new Date()
  const enCours = dossiers.filter(d => d.statut === 'en_attente')
  const enRetard = enCours.filter(d => d.date_echeance && joursAvantEcheance(d.date_echeance, now) < 0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <header className="px-4 sm:px-8 py-8" style={{ background: 'linear-gradient(135deg,#0f2318,#1a3c2e)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <LogoMark size={44} />
          <div className="min-w-0">
            <p className="text-xs text-green-200">{cab?.nom ?? ''}</p>
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{client.raison_sociale}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: 'Dossiers', v: dossiers.length, c: '#1a5c3e' },
            { l: 'Documents attendus', v: enCours.length, c: '#d97706' },
            { l: 'En retard', v: enRetard.length, c: '#dc2626' },
          ].map(k => (
            <div key={k.l} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{k.l}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: k.c }}>{k.v}</p>
            </div>
          ))}
        </div>

        {enRetard.length > 0 && (
          <div className="rounded-2xl p-4 text-sm" style={{ background: '#fef2f2', color: '#991b1b', borderLeft: '4px solid #dc2626' }}>
            {enRetard.length} échéance(s) dépassée(s) : merci de transmettre les documents manquants à votre collaborateur.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg,#1a3c2e,#2d6a4f)' }}>
            <h2 className="font-semibold text-white text-sm">Vos obligations fiscales</h2>
          </div>
          {dossiers.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">Aucun dossier pour le moment.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {dossiers.map(d => {
                const retard = d.statut === 'en_attente' && d.date_echeance && joursAvantEcheance(d.date_echeance, now) < 0
                return (
                  <li key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{d.type_impot} <span className="font-normal text-gray-500">· {formatPeriode(d.type_impot, d.periode_mois, d.periode_annee)}</span></p>
                      <p className="text-xs text-gray-500 mt-0.5" style={retard ? { color: '#dc2626' } : undefined}>
                        Échéance : {d.date_echeance ? new Date(`${d.date_echeance}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—'}{retard ? ' (dépassée)' : ''}
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: `${STATUT_HEX[d.statut] ?? '#6b7280'}1a`, color: STATUT_HEX[d.statut] ?? '#6b7280' }}>
                      {STATUT_LABELS[d.statut] ?? d.statut}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 pb-6">Page en lecture seule. Pour toute question, contactez votre collaborateur au cabinet.</p>
      </main>
    </div>
  )
}
