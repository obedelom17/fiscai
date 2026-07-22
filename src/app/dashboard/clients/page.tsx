'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import PageHeader from '@/components/PageHeader'

type Client = {
  id: string
  raison_sociale: string
  nif: string
  regime_fiscal: string
  secteur_activite: string
  email_contact: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [clientEnEdition, setClientEnEdition] = useState<Client | null>(null)
  const [clientASupprimer, setClientASupprimer] = useState<Client | null>(null)
  const [recherche, setRecherche] = useState('')
  const [raison_sociale, setRaison] = useState('')
  const [nif, setNif] = useState('')
  const [regime_fiscal, setRegime] = useState('RR_TVA')
  const [secteur_activite, setSecteur] = useState('')
  const [email_contact, setEmailContact] = useState('')
  const [saving, setSaving] = useState(false)
  const [supprimant, setSupprimant] = useState(false)
  const supabase = createClient()

  useEffect(() => { chargerClients() }, [])

  async function chargerClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  
  
  setClients(data || [])
  setLoading(false)
}

  function ouvrirFormulaire(client?: Client) {
    if (client) {
      setClientEnEdition(client)
      setRaison(client.raison_sociale)
      setNif(client.nif)
      setRegime(client.regime_fiscal)
      setSecteur(client.secteur_activite)
      setEmailContact(client.email_contact)
    } else {
      setClientEnEdition(null)
      setRaison(''); setNif(''); setRegime('RR_TVA'); setSecteur(''); setEmailContact('')
    }
    setShowForm(true)
  }

  async function sauvegarderClient() {
    setSaving(true)
    if (clientEnEdition) {
      await supabase.from('clients').update({
        raison_sociale, nif, regime_fiscal, secteur_activite, email_contact
      }).eq('id', clientEnEdition.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('clients').insert({
        raison_sociale, nif, regime_fiscal, secteur_activite, email_contact,
        collaborateur_id: user?.id
      })
    }
    setShowForm(false)
    setClientEnEdition(null)
    chargerClients()
    setSaving(false)
  }

  async function supprimerClient() {
    if (!clientASupprimer) return
    setSupprimant(true)
    await supabase.from('clients').delete().eq('id', clientASupprimer.id)
    setClientASupprimer(null)
    chargerClients()
    setSupprimant(false)
  }

  const clientsFiltres = clients.filter(c =>
    c.raison_sociale.toLowerCase().includes(recherche.toLowerCase()) ||
    c.nif.includes(recherche)
  )

  const REGIME_LABELS: Record<string, string> = {
    RR_TVA: 'Réel avec TVA',
    RR_STVA: 'Réel sans TVA',
    TPU_F: 'TPU Forfaitaire',
    TPU_D: 'TPU Déclaratif',
  }

  const REGIME_COLORS: Record<string, string> = {
    RR_TVA: 'bg-blue-100 text-blue-700',
    RR_STVA: 'bg-purple-100 text-purple-700',
    TPU_F: 'bg-orange-100 text-orange-700',
    TPU_D: 'bg-green-100 text-green-700',
  }

  return (
    <div style={{ background: '#f0f4f1' }}>
      <PageHeader
        titre="Portefeuille Clients"
        sousTitre={`${clients.length} entreprise(s) enregistrée(s)`}
        imageUrl="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80"
        bouton={
          <motion.button onClick={() => ouvrirFormulaire()}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="px-5 py-2.5 rounded-xl text-white font-medium shadow-lg"
            style={{ background: 'linear-gradient(135deg, #e8a317, #d4940f)' }}>
            + Nouveau client
          </motion.button>
        }
      />

      <div className="px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total clients', value: clients.length, color: '#2d6a4f' },
            { label: 'Réel avec TVA', value: clients.filter(c => c.regime_fiscal === 'RR_TVA').length, color: '#3b82f6' },
            { label: 'Réel sans TVA', value: clients.filter(c => c.regime_fiscal === 'RR_STVA').length, color: '#8b5cf6' },
            { label: 'TPU', value: clients.filter(c => c.regime_fiscal === 'TPU_F' || c.regime_fiscal === 'TPU_D').length, color: '#e8a317' },
          ].map((stat, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-default">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Recherche */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-3">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher par raison sociale ou NIF..."
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400" />
          <AnimatePresence>
            {recherche && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setRecherche('')}
                className="text-gray-400 hover:text-gray-600 text-sm">
                Effacer
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Formulaire ajout/édition */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold" style={{ color: '#1a3c2e' }}>
                  {clientEnEdition ? 'Modifier le client' : 'Nouveau client'}
                </h2>
                <motion.button whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}
                  onClick={() => { setShowForm(false); setClientEnEdition(null) }}
                  className="text-gray-400 hover:text-gray-600 text-xl">✕</motion.button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Raison sociale</label>
                  <input type="text" value={raison_sociale} onChange={e => setRaison(e.target.value)}
                    placeholder="Nom de l'entreprise"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">NIF</label>
                  <input type="text" value={nif} onChange={e => setNif(e.target.value)}
                    placeholder="Numéro d'identification fiscale"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Régime fiscal</label>
                  <select value={regime_fiscal} onChange={e => setRegime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="RR_TVA">Régime Réel avec TVA</option>
                    <option value="RR_STVA">Régime Réel sans TVA</option>
                    <option value="TPU_F">Taxe Professionnelle Unique Forfaitaire</option>
                    <option value="TPU_D">Taxe Professionnelle Unique Déclarative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Secteur d'activité</label>
                  <input type="text" value={secteur_activite} onChange={e => setSecteur(e.target.value)}
                    placeholder="Ex: Commerce, BTP, Services..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email de contact</label>
                  <input type="email" value={email_contact} onChange={e => setEmailContact(e.target.value)}
                    placeholder="contact@entreprise.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <motion.button onClick={sauvegarderClient} disabled={saving}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                  {saving ? 'Enregistrement...' : clientEnEdition ? 'Modifier' : 'Enregistrer'}
                </motion.button>
                <motion.button onClick={() => { setShowForm(false); setClientEnEdition(null) }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Annuler
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal confirmation suppression */}
        <AnimatePresence>
          {clientASupprimer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)' }}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Supprimer ce client ?</h3>
                <p className="text-gray-500 text-sm mb-6">
                  <strong>{clientASupprimer.raison_sociale}</strong> et tous ses dossiers fiscaux seront supprimés définitivement.
                </p>
                <div className="flex gap-3">
                  <motion.button onClick={supprimerClient} disabled={supprimant}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium bg-red-600 disabled:opacity-50">
                    {supprimant ? 'Suppression...' : 'Supprimer'}
                  </motion.button>
                  <motion.button onClick={() => setClientASupprimer(null)}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">
                    Annuler
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 rounded-full border-2"
              style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
          </div>
        ) : clientsFiltres.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">
              {recherche ? 'Aucun résultat pour cette recherche' : 'Aucun client enregistré'}
            </p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                  {['Raison sociale', 'NIF', 'Régime fiscal', "Secteur d'activité", 'Email contact', 'Actions'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {clientsFiltres.map((client, i) => (
                    <motion.tr key={client.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="border-b border-gray-50 hover:bg-green-50 transition-colors"
                      style={{ background: i % 2 === 0 ? 'white' : '#fafffe' }}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <motion.div whileHover={{ scale: 1.1 }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                            {client.raison_sociale[0].toUpperCase()}
                          </motion.div>
                          <span className="text-sm font-semibold text-gray-800">{client.raison_sociale}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">{client.nif}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${REGIME_COLORS[client.regime_fiscal]}`}>
                          {REGIME_LABELS[client.regime_fiscal]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{client.secteur_activite}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{client.email_contact}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() => ouvrirFormulaire(client)}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium"
                            style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                            Modifier
                          </motion.button>
                          <motion.button
                            onClick={() => setClientASupprimer(client)}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-600">
                            Supprimer
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  )
}