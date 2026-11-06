'use client'
import { useState } from 'react'

export default function ExportMenu() {
  const [mois, setMois] = useState(new Date().toISOString().slice(0, 7))
  const [ouvert, setOuvert] = useState(false)

  return (
    <div className="relative">
      <button onClick={() => setOuvert(o => !o)} aria-haspopup="menu" aria-expanded={ouvert}
        className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white shadow-sm border border-gray-100" style={{ color: '#1a3c2e' }}>
        Exporter Excel
      </button>
      {ouvert && (
        <div role="menu" className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-lg border border-gray-100 p-3 z-30 space-y-3">
          <a role="menuitem" href="/api/export-excel?type=dossiers" onClick={() => setOuvert(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-green-50" style={{ color: '#1a3c2e' }}>Tous les dossiers</a>
          <div className="border-t border-gray-100 pt-3">
            <label htmlFor="exp-mois" className="block text-xs font-medium text-gray-500 mb-1">Rapport mensuel par client</label>
            <div className="flex gap-2">
              <input id="exp-mois" type="month" value={mois} onChange={e => setMois(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              <a role="menuitem" href={`/api/export-excel?type=rapport-mensuel&mois=${mois}`} onClick={() => setOuvert(false)}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#2d6a4f' }}>Télécharger</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
