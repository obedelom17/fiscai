'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import { EmptyState } from '@/components/Skeleton'

type Erreur = { id: number; message: string; digest: string | null; url: string | null; stack: string | null; created_at: string }

export default function ErreursPage() {
  const supabase = createClient()
  const [erreurs, setErreurs] = useState<Erreur[]>([])
  const [loading, setLoading] = useState(true)
  const [ouvert, setOuvert] = useState<number | null>(null)

  const charger = useCallback(async () => {
    const { data } = await supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(100)
    setErreurs((data ?? []) as Erreur[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { charger() }, [charger])

  async function vider() {
    if (!confirm('Supprimer tout le journal d\'erreurs ?')) return
    await supabase.from('error_logs').delete().gte('id', 0)
    charger()
  }

  return (
    <div style={{ background: 'var(--surface)' }} className="min-h-screen">
      <PageHeader banner="parametres" titre="Journal d'erreurs" sousTitre="Erreurs rencontrées par les utilisateurs (90 derniers jours)"
        bouton={erreurs.length > 0 ? <button onClick={vider} className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-red-600">Vider</button> : undefined} />
      <div className="px-4 md:px-8 pb-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? <p className="p-8 text-sm text-gray-500">Chargement…</p> : erreurs.length === 0 ? (
            <EmptyState titre="Aucune erreur enregistrée" description="Tout fonctionne. Les erreurs rencontrées par vos collaborateurs apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {erreurs.map(e => (
                <li key={e.id} className="px-5 py-3.5">
                  <button className="w-full text-left" onClick={() => setOuvert(ouvert === e.id ? null : e.id)} aria-expanded={ouvert === e.id}>
                    <p className="text-sm font-medium text-gray-800 break-words">{e.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(e.created_at).toLocaleString('fr-FR')} · {e.url ?? '—'}</p>
                  </button>
                  {ouvert === e.id && (
                    <pre className="mt-2 text-xs bg-gray-50 rounded-xl p-3 overflow-x-auto text-gray-600 whitespace-pre-wrap">{e.stack ?? 'Pas de trace'}{e.digest ? `\nRéférence : ${e.digest}` : ''}</pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
