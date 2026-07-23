'use client'

export const dynamic = 'force-dynamic'

import PageHeader from '@/components/PageHeader'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { PageLoader } from '@/components/Spinner'

type Collaborateur = { id: string; nom: string; prenom: string; email: string; role: string; avatar_url?: string | null }
type Client = { id: string; raison_sociale: string; nif: string; secteur_activite: string; collaborateur_id: string | null }

export default function PortefeuillesPage() {
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmSupprimer, setConfirmSupprimer] = useState<string | null>(null)
  const [supprimant, setSupprimant] = useState(false)
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
  // Compter les admins actuels
  const { data: admins } = await supabase
    .from('collaborateurs')
    .select('id')
    .eq('role', 'admin')

  // Bloquer si c'est le dernier admin
  if (role === 'collaborateur' && admins && admins.length <= 1) {
    alert('Impossible — il doit y avoir au moins un administrateur dans le système.')
    return
  }

  await supabase.from('collaborateurs').update({ role }).eq('id', collaborateurId)
  charger()
}

  async function supprimerCollaborateur(collaborateurId: string) {
    setSupprimant(true)
    try {
      const res = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: collaborateurId })
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erreur lors de la suppression')
      } else {
        setConfirmSupprimer(null)
        charger()
      }
    } catch {
      alert('Erreur réseau')
    }
    setSupprimant(false)
  }

  if (loading) return <PageLoader className="min-h-screen" spinnerClassName="w-10 h-10" />

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f1' }}>
      
     <PageHeader
  titre="Gestion des Portefeuilles"
  sousTitre="Attribution des clients aux collaborateurs du cabinet"
  imageUrl="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80"
/>
      <div className="max-w-7xl mx-auto px-6 py-8">

       

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Collaborateurs', value: collaborateurs.length, color: '#1a3c2e' },
            { label: 'Clients total', value: clients.length, color: '#2d6a4f' },
            { label: 'Non attribués', value: clients.filter(c => !c.collaborateur_id).length, color: '#d97706' },
          ].map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-default">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">

          {/* Collaborateurs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
              <h2 className="font-bold text-white">Collaborateurs ({collaborateurs.length})</h2>
              <p className="text-green-300 text-xs mt-0.5">Gestion des rôles et accès</p>
            </div>
            <div className="p-4 space-y-3">
              <AnimatePresence>
                {collaborateurs.length === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-400 text-sm text-center py-8">
                    Aucun collaborateur enregistré
                  </motion.p>
                ) : collaborateurs.map((c, i) => (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ x: 3, boxShadow: '0 4px 15px rgba(45,106,79,0.1)' }}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 transition-all"
                    style={{ background: '#fafffe' }}>
                    <div className="flex items-center gap-3">
                      <motion.div whileHover={{ scale: 1.1 }}
                        className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0"
                        style={{ background: c.avatar_url ? 'transparent' : 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                        {c.avatar_url
                          ? <img src={c.avatar_url} alt={`${c.prenom} ${c.nom}`} className="w-full h-full object-cover" />
                          : <>{c.prenom[0]}{c.nom[0]}</>
                        }
                      </motion.div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{c.prenom} {c.nom}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#2d6a4f' }}>
                          {clients.filter(cl => cl.collaborateur_id === c.id).length} client(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={c.role} onChange={e => changerRole(c.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                        style={{ color: c.role === 'admin' ? '#1a3c2e' : '#6b7280' }}
                        disabled={c.role === 'admin' && collaborateurs.filter(x => x.role === 'admin').length <= 1}>
                        <option value="collaborateur">Collaborateur</option>
                        <option value="admin">Admin</option>
                      </select>
                      {confirmSupprimer === c.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => supprimerCollaborateur(c.id)}
                            disabled={supprimant}
                            className="text-xs px-2 py-1 rounded-lg bg-red-600 text-white disabled:opacity-50 whitespace-nowrap">
                            {supprimant ? '...' : 'Confirmer'}
                          </button>
                          <button
                            onClick={() => setConfirmSupprimer(null)}
                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500">
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (c.role === 'admin' && collaborateurs.filter(x => x.role === 'admin').length <= 1) {
                              alert('Impossible — dernier administrateur')
                              return
                            }
                            setConfirmSupprimer(c.id)
                          }}
                          title="Supprimer ce compte"
                          className="text-xs px-2 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all">
                          ✕
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Attribution clients */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
              <h2 className="font-bold text-white">Attribution des clients ({clients.length})</h2>
              <p className="text-green-300 text-xs mt-0.5">Assignez chaque client à un collaborateur</p>
            </div>
            <div className="p-4 space-y-3">
              <AnimatePresence>
                {clients.length === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-400 text-sm text-center py-8">
                    Aucun client enregistré
                  </motion.p>
                ) : clients.map((cl, i) => (
                  <motion.div key={cl.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ x: -3, boxShadow: '0 4px 15px rgba(45,106,79,0.1)' }}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 transition-all"
                    style={{ background: cl.collaborateur_id ? '#fafffe' : '#fffbeb' }}>
                    <div className="flex items-center gap-3">
                      <motion.div whileHover={{ scale: 1.1 }}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                        style={{ background: cl.collaborateur_id ? 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' : '#e8a317' }}>
                        {cl.raison_sociale[0].toUpperCase()}
                      </motion.div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{cl.raison_sociale}</p>
                        <p className="text-xs text-gray-400">NIF: {cl.nif}</p>
                      </div>
                    </div>
                    <select value={cl.collaborateur_id || ''} onChange={e => attribuerClient(cl.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 max-w-36"
                      style={{ color: cl.collaborateur_id ? '#2d6a4f' : '#d97706' }}>
                      <option value="">Non attribué</option>
                      {collaborateurs.map(c => (
                        <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                      ))}
                    </select>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}