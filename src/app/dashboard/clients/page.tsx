'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#1a3c2e' }}>Portefeuille Clients</h1>
            <p className="text-gray-500 mt-1">{clients.length} entreprise(s) enregistrée(s)</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium shadow-lg transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
            + Nouveau client
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total clients', value: clients.length, color: '#2d6a4f' },
            { label: 'Régime RSI', value: clients.filter(c => c.regime_fiscal === 'RSI').length, color: '#3b82f6' },
            { label: 'Régime RNI', value: clients.filter(c => c.regime_fiscal === 'RNI').length, color: '#8b5cf6' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-3">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher par raison sociale ou NIF..."
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400" />
          {recherche && (
            <button onClick={() => setRecherche('')} className="text-gray-400 hover:text-gray-600 text-sm">
              Effacer
            </button>
          )}
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#1a3c2e' }}>Nouveau client</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
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
                  <option value="RSI">RSI — Réel Simplifié d'Imposition</option>
                  <option value="RNI">RNI — Réel Normal d'Imposition</option>
                  <option value="forfait">Forfait</option>
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
              <button onClick={ajouterClient} disabled={saving}
                className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 shadow-md"
                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                {saving ? 'Enregistrement...' : 'Enregistrer le client'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Chargement...</div>
        ) : clientsFiltres.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">
              {recherche ? 'Aucun résultat pour cette recherche' : 'Aucun client enregistré'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {!recherche && 'Cliquez sur "+ Nouveau client" pour commencer'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                  {['Raison sociale', 'NIF', 'Régime fiscal', "Secteur d'activité", 'Email contact'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientsFiltres.map((client, i) => (
                  <tr key={client.id}
                    className="border-b border-gray-50 hover:bg-green-50 transition-colors"
                    style={{ background: i % 2 === 0 ? 'white' : '#fafffe' }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                          {client.raison_sociale[0].toUpperCase()}
                        </div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}