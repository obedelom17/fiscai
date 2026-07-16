'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Collaborateur = { id: string; nom: string; prenom: string; email: string; role: string }
type Client = { id: string; raison_sociale: string; nif: string; collaborateur_id: string | null }

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
    await supabase.from('clients')
      .update({ collaborateur_id: collaborateurId || null })
      .eq('id', clientId)
    charger()
  }

  async function changerRole(collaborateurId: string, role: string) {
    await supabase.from('collaborateurs')
      .update({ role })
      .eq('id', collaborateurId)
    charger()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <span className="font-bold text-gray-800">FiscAl</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/dashboard/clients" className="text-sm text-gray-500 hover:text-gray-800">Clients</a>
          <a href="/dashboard/dossiers" className="text-sm text-gray-500 hover:text-gray-800">Dossiers</a>
          <a href="/dashboard/assistant" className="text-sm text-gray-500 hover:text-gray-800">Assistant IA</a>
          <a href="/admin/portefeuilles" className="text-sm font-medium text-blue-600">Portefeuilles</a>
          <a href="/admin/statistiques" className="text-sm text-gray-500 hover:text-gray-800">Statistiques</a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Gestion des portefeuilles</h1>
          <p className="text-gray-500 text-sm mt-1">Attribuez les clients aux collaborateurs</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Collaborateurs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Collaborateurs ({collaborateurs.length})</h2>
            <div className="space-y-3">
              {collaborateurs.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun collaborateur</p>
              ) : collaborateurs.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.prenom} {c.nom}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {clients.filter(cl => cl.collaborateur_id === c.id).length} client(s)
                    </p>
                  </div>
                  <select
                    value={c.role}
                    onChange={e => changerRole(c.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none"
                  >
                    <option value="collaborateur">Collaborateur</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Attribution clients */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Attribution des clients ({clients.length})</h2>
            <div className="space-y-3">
              {clients.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun client</p>
              ) : clients.map(cl => (
                <div key={cl.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{cl.raison_sociale}</p>
                    <p className="text-xs text-gray-500">NIF: {cl.nif}</p>
                  </div>
                  <select
                    value={cl.collaborateur_id || ''}
                    onChange={e => attribuerClient(cl.id, e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none max-w-32"
                  >
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