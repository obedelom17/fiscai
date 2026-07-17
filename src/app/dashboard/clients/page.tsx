'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { motion, AnimatePresence } from 'framer-motion'

type Client = {
  id: string
  raison_sociale: string
  nif: string
  regime_fiscal: string
  secteur_activite: string
  email_contact: string
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [raison_sociale, setRaison] = useState('')
  const [nif, setNif] = useState('')
  const [regime_fiscal, setRegime] = useState('RSI')
  const [secteur_activite, setSecteur] = useState('')
  const [email_contact, setEmailContact] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { chargerClients() }, [])

  async function chargerClients() {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  async function ajouterClient() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('clients').insert({
      raison_sociale, nif, regime_fiscal, secteur_activite, email_contact,
      collaborateur_id: user?.id
    })
    setShowForm(false)
    setRaison(''); setNif(''); setSecteur(''); setEmailContact('')
    chargerClients()
    setSaving(false)
  }

  const clientsFiltres = clients.filter(c =>
    c.raison_sociale.toLowerCase().includes(recherche.toLowerCase()) ||
    c.nif.includes(recherche)
  )

  const REGIME_COLORS: Record<string, string> = {
    RSI: 'bg-blue-100 text-blue-700',
    RNI: 'bg-purple-100 text-purple-700',
    forfait: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f1' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#1a3c2e' }}>Portefeuille Clients</h1>
            <p className="text-gray-500 mt-1">{clients.length} entreprise(s) enregistrée(s)</p>
          </div>
          <motion.button
            onClick={() => setShowForm(true)}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 25px rgba(45,106,79,0.4)' }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-2.5 rounded-xl text-white font-medium shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
            + Nouveau client
          </motion.button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total clients', value: clients.length, color: '#2d6a4f' },
            { label: 'Régime RSI', value: clients.filter(c => c.regime_fiscal === 'RSI').length, color: '#3b82f6' },
            { label: 'Régime RNI', value: clients.filter(c => c.regime_fiscal === 'RNI').length, color: '#8b5cf6' },
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

        {/* Formulaire */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold" style={{ color: '#1a3c2e' }}>Nouveau client</h2>
                <motion.button whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}
                  onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</motion.button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Raison sociale', value: raison_sociale, set: setRaison, placeholder: "Nom de l'entreprise", type: 'text' },
                  { label: 'NIF', value: nif, set: setNif, placeholder: "Numéro d'identification fiscale", type: 'text' },
                  { label: "Secteur d'activité", value: secteur_activite, set: setSecteur, placeholder: 'Ex: Commerce, BTP...', type: 'text' },
                  { label: 'Email de contact', value: email_contact, set: setEmailContact, placeholder: 'contact@entreprise.com', type: 'email' },
                ].map((field, i) => (
                  <div key={i}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{field.label}</label>
                    <input type={field.type} value={field.value} onChange={e => field.set(e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Régime fiscal</label>
                  <select value={regime_fiscal} onChange={e => setRegime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="RSI">RSI — Réel Simplifié d'Imposition</option>
                    <option value="RNI">RNI — Réel Normal d'Imposition</option>
                    <option value="forfait">Forfait</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <motion.button onClick={ajouterClient} disabled={saving}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                  {saving ? 'Enregistrement...' : 'Enregistrer le client'}
                </motion.button>
                <motion.button onClick={() => setShowForm(false)}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Annuler
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 rounded-full border-2 border-t-transparent"
              style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
          </div>
        ) : clientsFiltres.length === 0 ? (
          <motion.div {...fadeUp} className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">
              {recherche ? 'Aucun résultat pour cette recherche' : 'Aucun client enregistré'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {!recherche && 'Cliquez sur "+ Nouveau client" pour commencer'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                  {['Raison sociale', 'NIF', 'Régime fiscal', "Secteur d'activité", 'Email contact'].map(h => (
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
                          {client.regime_fiscal}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{client.secteur_activite}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{client.email_contact}</td>
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