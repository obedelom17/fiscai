'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'

export default function GenererEcheancesModal({ ouvert, onClose, onDone }: { ouvert: boolean; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast()
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [apercu, setApercu] = useState<{ crees: number; clients: number } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!ouvert) return
    setApercu(null)
    fetch('/api/generer-echeances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ annee, dryRun: true }) })
      .then(r => r.json()).then(d => { if (typeof d.crees === 'number') setApercu(d) }).catch(() => {})
  }, [ouvert, annee])

  useEffect(() => {
    if (!ouvert) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [ouvert, onClose])

  if (!ouvert) return null

  async function generer() {
    setBusy(true)
    try {
      const r = await fetch('/api/generer-echeances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ annee }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erreur')
      toast(d.crees ? `${d.crees} échéance(s) créée(s)` : 'Aucune échéance manquante', 'success')
      onDone(); onClose()
    } catch (e) { toast(e instanceof Error ? e.message : 'Erreur', 'error') }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,31,22,0.55)' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="gen-titre" className="bg-white rounded-3xl p-6 w-full max-w-md shadow-lg" onClick={e => e.stopPropagation()}>
        <h2 id="gen-titre" className="text-lg font-bold text-gray-800">Générer les échéances</h2>
        <p className="text-sm text-gray-500 mt-1">Crée les dossiers manquants (TVA mensuelle, 4 acomptes, IS) selon le régime de chaque client. Les dossiers existants ne sont jamais dupliqués.</p>
        <label className="block mt-4 text-sm font-medium text-gray-700" htmlFor="gen-annee">Année</label>
        <select id="gen-annee" value={annee} onChange={e => setAnnee(Number(e.target.value))} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
          {[0, 1, 2].map(i => { const a = new Date().getFullYear() - 1 + i; return <option key={a} value={a}>{a}</option> })}
        </select>
        <p className="mt-4 text-sm rounded-xl px-3 py-2.5" style={{ background: '#f0f4f1', color: '#1a3c2e' }} aria-live="polite">
          {apercu ? `${apercu.crees} dossier(s) seraient créés pour ${apercu.clients} client(s).` : 'Calcul en cours…'}
        </p>
        <p className="mt-2 text-xs text-gray-500">Les dates d'échéance suivent les règles par défaut du cabinet : vérifiez-les dans le calendrier fiscal OTR.</p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>Annuler</button>
          <button onClick={generer} disabled={busy || apercu?.crees === 0} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#2d6a4f,#1a3c2e)' }}>
            {busy ? 'Création…' : 'Générer'}
          </button>
        </div>
      </div>
    </div>
  )
}
