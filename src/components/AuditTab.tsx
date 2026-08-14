'use client'

import { motion } from 'framer-motion'

type AuditLog = {
  id: string
  action: string
  details: string
  created_at: string
  collaborateurs: { nom: string; prenom: string } | null
}

export default function AuditTab({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
      <p className="text-gray-400 text-sm">Aucun log d'audit</p>
    </div>
  )

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const nom = (l: AuditLog) => l.collaborateurs ? `${l.collaborateurs.prenom} ${l.collaborateurs.nom}` : 'Système'

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                {['Date', 'Collaborateur', 'Action', 'Détails'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-green-50"
                  style={{ background: i % 2 === 0 ? 'white' : '#fafffe' }}>
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(l.created_at)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">{nom(l)}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                      {l.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 max-w-xs"><p className="truncate">{l.details}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {logs.map((l, i) => (
          <motion.div key={l.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded-lg flex-shrink-0"
                style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                {l.action.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{fmt(l.created_at)}</span>
            </div>
            <p className="text-xs font-semibold text-gray-700 mb-1">{nom(l)}</p>
            <p className="text-xs text-gray-500">{l.details}</p>
          </motion.div>
        ))}
      </div>
    </>
  )
}
