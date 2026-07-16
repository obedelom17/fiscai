'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  const [raison_sociale, setRaison] = useState('')
  const [nif, setNif] = useState('')
  const [regime_fiscal, setRegime] = useState('RSI')
  const [secteur_activite, setSecteur] = useState('')
  const [email_contact, setEmailContact] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    chargerClients()
  }, [])

  async function chargerClients() {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  async function ajouterClient() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('clients').insert({
      raison_sociale,
      nif,
      regime_fiscal,
      secteur_activite,
      email_contact,
      collaborateur_id: user?.id
    })
    setShowForm(false)
    setRaison(''); setNif(''); setSecteur(''); setEmailContact('')
    chargerClients()
    setSaving(false)
  }

  async function deconnexion() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <span className="font-bold text-gray-800">FiscAl</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/dashboard/clients" className="text-sm font-medium text-blue-600">Clients</a>
          <a href="/dashboard/dossiers" className="text-sm text-gray-500 hover:text-gray-800">Dossiers</a>
          <a href="/dashboard/assistant" className="text-sm text-gray-500 hover:text-gray-800">Assistant IA</a>
          <a href="/admin/statistiques" className="text-sm text-gray-500 hover:text-gray-800">Statistiques</a>
          <button onClick={deconnexion} className="text-sm text-red-500 hover:text-red-700">Déconnexion</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
            <p className="text-gray-500 text-sm mt-1">{clients.length} entreprise(s) dans votre portefeuille</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Nouveau client
          </button>
        </div>

        {/* Formulaire ajout */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Nouveau client</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
                <input value={raison_sociale} onChange={e => setRaison(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom de l'entreprise" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIF</label>
                <input value={nif} onChange={e => setNif(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Numéro d'identification fiscale" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Régime fiscal</label>
                <select value={regime_fiscal} onChange={e => setRegime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="RSI">RSI</option>
                  <option value="RNI">RNI</option>
                  <option value="forfait">Forfait</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secteur d'activité</label>
                <input value={secteur_activite} onChange={e => setSecteur(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Commerce, BTP..." />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de contact</label>
                <input value={email_contact} onChange={e => setEmailContact(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="contact@entreprise.com" type="email" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={ajouterClient} disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste clients */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">Aucun client pour l'instant</p>
            <p className="text-gray-400 text-sm mt-1">Cliquez sur "+ Nouveau client" pour commencer</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Raison sociale</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">NIF</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Régime</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Secteur</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{client.raison_sociale}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{client.nif}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{client.regime_fiscal}</span>
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