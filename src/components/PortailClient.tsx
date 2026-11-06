'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'

/** Bouton + fenêtre de gestion du lien du portail client (lecture seule). */
export default function PortailClient({ clientId, nom, token: tokenInitial, actif: actifInitial, onChange }: { clientId: string; nom: string; token?: string | null; actif?: boolean; onChange?: () => void }) {
  const { toast } = useToast()
  const [ouvert, setOuvert] = useState(false)
  const [token, setToken] = useState<string | null>(tokenInitial ?? null)
  const [actif, setActif] = useState(!!actifInitial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setToken(tokenInitial ?? null); setActif(!!actifInitial) }, [tokenInitial, actifInitial])

  const lien = token && typeof window !== 'undefined' ? `${window.location.origin}/portail/${token}` : ''

  async function agir(action: 'generer' | 'revoquer') {
    if (action === 'revoquer' && !confirm('Révoquer ce lien ? Le client ne pourra plus consulter son suivi.')) return
    setBusy(true)
    const r = await fetch('/api/portail-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, action }) })
    const d = await r.json()
    if (!r.ok) toast(d.error || 'Erreur', 'error')
    else { setToken(d.token); setActif(action === 'generer'); onChange?.(); toast(action === 'generer' ? 'Lien créé' : 'Lien révoqué', 'success') }
    setBusy(false)
  }

  async function copier() {
    try { await navigator.clipboard.writeText(lien); toast('Lien copié', 'success') } catch { toast('Copie impossible', 'error') }
  }

  return (
    <>
      <button onClick={() => setOuvert(true)} className="text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: actif ? '#dcfce7' : '#f0f4f1', color: '#2d6a4f' }} aria-label={`Portail client de ${nom}`}>
        Portail
      </button>
      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,31,22,0.55)' }} onClick={() => setOuvert(false)}>
          <div role="dialog" aria-modal="true" className="bg-white rounded-3xl p-6 w-full max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800">Portail client</h2>
            <p className="text-sm text-gray-500 mt-1">{nom} peut suivre l'état de ses dossiers via un lien privé, en lecture seule. Aucun montant n'est affiché.</p>
            {actif && lien ? (
              <div className="mt-4 space-y-3">
                <input readOnly value={lien} onFocus={e => e.currentTarget.select()} aria-label="Lien du portail" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={copier} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#2d6a4f' }}>Copier le lien</button>
                  <button onClick={() => agir('generer')} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>Nouveau lien</button>
                  <button onClick={() => agir('revoquer')} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600">Révoquer</button>
                </div>
              </div>
            ) : (
              <button onClick={() => agir('generer')} disabled={busy} className="mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#2d6a4f,#1a3c2e)' }}>Créer le lien</button>
            )}
            <div className="flex justify-end mt-5"><button onClick={() => setOuvert(false)} className="px-4 py-2 rounded-xl text-sm" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>Fermer</button></div>
          </div>
        </div>
      )}
    </>
  )
}
