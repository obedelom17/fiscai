'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type HistoriqueEntry = {
  id: string
  ancien_statut: string | null
  nouveau_statut: string
  created_at: string
  collaborateurs: { nom: string; prenom: string } | null
}

const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  recu: 'Reçu',
  valide: 'Validé',
  televerse_otr: 'Téléversé OTR',
}

const STATUT_COLORS: Record<string, string> = {
  en_attente: '#d97706',
  recu: '#3b82f6',
  valide: '#2d6a4f',
  televerse_otr: '#8b5cf6',
}

export default function HistoriqueStatuts({ dossierId }: { dossierId: string }) {
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    charger()
  }, [dossierId])

  async function charger() {
    const { data } = await supabase
      .from('historique_statuts')
      .select('*, collaborateurs(nom, prenom)')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: true })
    setHistorique(data || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-4">
      <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        Historique des statuts ({historique.length})
      </h3>

      {historique.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">Aucun changement de statut enregistré.</p>
      ) : (
        <div className="relative">
          {/* Ligne verticale */}
          <div className="absolute left-3.5 top-2 bottom-2 w-0.5" style={{ background: '#e5e7eb' }} />

          <div className="space-y-3">
            {historique.map((h, i) => (
              <div key={h.id} className="flex items-start gap-3 relative">
                {/* Point */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-white"
                  style={{ background: STATUT_COLORS[h.nouveau_statut] || '#9ca3af' }}
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {h.ancien_statut && (
                      <>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: STATUT_COLORS[h.ancien_statut] + '20', color: STATUT_COLORS[h.ancien_statut] }}>
                          {STATUT_LABELS[h.ancien_statut] || h.ancien_statut}
                        </span>
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: STATUT_COLORS[h.nouveau_statut] + '20', color: STATUT_COLORS[h.nouveau_statut] }}>
                      {STATUT_LABELS[h.nouveau_statut] || h.nouveau_statut}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    {h.collaborateurs && (
                      <p className="text-xs text-gray-500">
                        · {h.collaborateurs.prenom} {h.collaborateurs.nom}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
