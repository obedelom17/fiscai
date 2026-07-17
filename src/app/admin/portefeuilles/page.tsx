'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type Collaborateur = { id: string; nom: string; prenom: string; email: string; role: string }
type Client = { id: string; raison_sociale: string; nif: string; secteur_activite: string; collaborateur_id: string | null }

export default function PortefeuillesPage() {
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { charger() }, [])

  async function charger() {
    const { data: c } = await supabase.from('collaborateurs').select('*').order('nom')
    const { data: cl } = await supabase.from('clients').select('*').order('raison_sociale')
    setCollaborateurs(c || [])
    setClients(cl || [])
    setLoading(false)
  }

  async function attribuerClient(clientId: string, collaborateurId: string) {
    await supabase.from('clients').update({ collaborateur_id: collaborateurId || null }).eq('id', clientId)
    charger()
  }

  async function changerRole(collaborateurId: string, role: string) {
    await supabase.from('collaborateurs').update({ role }).eq('id', collaborateurId)
    charger()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f4f1' }}>
      <p className="text-gray-400">Chargement...</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f1' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#1a3c2e' }}>Gestion des Portefeuilles</h1>
          <p className="text-gray-500 mt-1">Attribution des clients aux collaborateurs du cabinet</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Collaborateurs', value: collaborateurs.length, color: '#1a3c2e' },
            { label: 'Clients total', value: clients.length, color: '#2d6a4f' },
            { label: 'Non attribués', value: clients.filter(c => !c.collaborateur_id).length, color: '#d97706' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">

          {/* Collaborateurs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
              <h2 className="font-bold text-white">Collaborateurs ({collaborateurs.length})</h2>
              <p className="text-green-300 text-xs mt-0.5">Gestion des rôles et accès</p>
            </div>
            <div className="p-4 space-y-3">
              {collaborateurs.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Aucun collaborateur enregistré</p>
              ) : collaborateurs.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-green-200 transition-all"
                  style={{ background: '#fafffe' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                      {c.prenom[0]}{c.nom[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{c.prenom} {c.nom}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#2d6a4f' }}>
                        {clients.filter(cl => cl.collaborateur_id === c.id).length} client(s) assigné(s)
                      </p>
                    </div>
                  </div>
                  <select value={c.role} onChange={e => changerRole(c.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none"
                    style={{ color: c.role === 'admin' ? '#1a3c2e' : '#6b7280' }}>
                    <option value="collaborateur">Collaborateur</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Attribution clients */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
              <h2 className="font-bold text-white">Attribution des clients ({clients.length})</h2>
              <p className="text-green-300 text-xs mt-0.5">Assignez chaque client à un collaborateur</p>
            </div>
            <div className="p-4 space-y-3">
              {clients.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Aucun client enregistré</p>
              ) : clients.map(cl => (
                <div key={cl.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-green-200 transition-all"
                  style={{ background: cl.collaborateur_id ? '#fafffe' : '#fffbeb' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: cl.collaborateur_id ? 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' : '#e8a317' }}>
                      {cl.raison_sociale[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{cl.raison_sociale}</p>
                      <p className="text-xs text-gray-400">NIF: {cl.nif}</p>
                    </div>
                  </div>
                  <select value={cl.collaborateur_id || ''} onChange={e => attribuerClient(cl.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none max-w-36"
                    style={{ color: cl.collaborateur_id ? '#2d6a4f' : '#d97706' }}>
                    <option value="">Non attribué</option>
                    {collaborateurs.map(c => (
                      <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}