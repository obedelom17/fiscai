'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import PageHeader from '@/components/PageHeader'
import { useToast } from '@/components/Toast'
import { Spinner } from '@/components/Spinner'
import { REGIME_LABELS, REGIME_COLORS } from '@/lib/constants'

type Client = {
  id: string
  raison_sociale: string
  nif: string
  regime_fiscal: string
  secteur_activite: string
  email_contact: string
  telephone?: string
}

export default function ClientsPage() {
  const { toast } = useToast()
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
  const [telephone, setTelephone] = useState('')
  const [saving, setSaving] = useState(false)
  const [supprimant, setSupprimant] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { charger() }, [])

  async function charger() {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  function ouvrirFormulaire(client?: Client) {
    if (client) {
      setClientEnEdition(client)
      setRaison(client.raison_sociale); setNif(client.nif); setRegime(client.regime_fiscal)
      setSecteur(client.secteur_activite); setEmailContact(client.email_contact); setTelephone(client.telephone || '')
    } else {
      setClientEnEdition(null)
      setRaison(''); setNif(''); setRegime('RR_TVA'); setSecteur(''); setEmailContact(''); setTelephone('')
    }
    setShowForm(true)
  }

  async function sauvegarderClient() {
    if (!raison_sociale.trim()) return
    setSaving(true)
    const payload = { raison_sociale, nif, regime_fiscal, secteur_activite, email_contact, telephone }
    if (clientEnEdition) {
      await supabase.from('clients').update(payload).eq('id', clientEnEdition.id)
      toast('Client modifié avec succès')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('clients').insert({ ...payload, collaborateur_id: user?.id })
      toast('Client créé avec succès')
    }
    setShowForm(false); setClientEnEdition(null); charger(); setSaving(false)
  }

  async function supprimerClient() {
    if (!clientASupprimer) return
    setSupprimant(true)
    await supabase.from('clients').delete().eq('id', clientASupprimer.id)
    toast('Client supprimé', 'error')
    setClientASupprimer(null); charger(); setSupprimant(false)
  }

  async function exporterBulletin(client: Client) {
    setExportingId(client.id)
    try {
      const res = await fetch(`/api/export-pdf?client_id=${client.id}`)
      if (!res.ok) throw new Error('Erreur export')
      const html = await res.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bulletin-fiscal-${client.raison_sociale.replace(/[^a-zA-Z0-9]/g, '-')}.html`
      a.click()
      URL.revokeObjectURL(url)
      toast('Bulletin exporté avec succès')
    } catch {
      toast('Erreur lors de l\'export', 'error')
    }
    setExportingId(null)
  }

  const clientsFiltres = clients.filter(c =>
    c.raison_sociale.toLowerCase().includes(recherche.toLowerCase()) || c.nif.includes(recherche)
  )

  return (
    <div style={{ background: '#f0f4f1', minHeight: '100vh' }}>
      <PageHeader
        titre="Portefeuille Clients"
        sousTitre={`${clients.length} entreprise(s) enregistrée(s)`}
        imageUrl="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80"
        bouton={
          <motion.button onClick={() => ouvrirFormulaire()}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="px-4 py-2 rounded-xl text-white font-medium shadow-lg text-sm"
            style={{ background: 'linear-gradient(135deg, #e8a317, #d4940f)' }}>
            + Nouveau
          </motion.button>
        }
      />

      <div className="px-4 md:px-8 py-6 md:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            { label: 'Total', value: clients.length, color: '#2d6a4f' },
            { label: 'Réel TVA', value: clients.filter(c => c.regime_fiscal === 'RR_TVA').length, color: '#3b82f6' },
            { label: 'Réel sans TVA', value: clients.filter(c => c.regime_fiscal === 'RR_STVA').length, color: '#8b5cf6' },
            { label: 'TPU', value: clients.filter(c => c.regime_fiscal.startsWith('TPU')).length, color: '#e8a317' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold">{s.label}</p>
              <p className="text-2xl md:text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Recherche */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4 mb-4 flex items-center gap-3">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher par raison sociale ou NIF..."
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400 min-w-0" />
          {recherche && (
            <button onClick={() => setRecherche('')} className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0">Effacer</button>
          )}
        </div>

        {/* Formulaire */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 md:p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base md:text-lg font-bold" style={{ color: '#1a3c2e' }}>
                  {clientEnEdition ? 'Modifier le client' : 'Nouveau client'}
                </h2>
                <button onClick={() => { setShowForm(false); setClientEnEdition(null) }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Raison sociale', value: raison_sociale, set: setRaison, placeholder: "Nom de l'entreprise", type: 'text' },
                  { label: 'NIF', value: nif, set: setNif, placeholder: "Numéro d'identification fiscale", type: 'text' },
                  { label: "Secteur d'activité", value: secteur_activite, set: setSecteur, placeholder: 'Commerce, BTP, Services...', type: 'text' },
                  { label: 'Email de contact', value: email_contact, set: setEmailContact, placeholder: 'contact@entreprise.com', type: 'email' },
                  { label: 'Téléphone (WhatsApp)', value: telephone, set: setTelephone, placeholder: '+228 90 00 00 00', type: 'tel' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{f.label}</label>
                    <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Régime fiscal</label>
                  <select value={regime_fiscal} onChange={e => setRegime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="RR_TVA">Régime Réel avec TVA</option>
                    <option value="RR_STVA">Régime Réel sans TVA</option>
                    <option value="TPU_F">TPU Forfaitaire</option>
                    <option value="TPU_D">TPU Déclaratif</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <motion.button onClick={sauvegarderClient} disabled={saving || !raison_sociale.trim()}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                  {saving ? 'Enregistrement...' : clientEnEdition ? 'Modifier' : 'Enregistrer'}
                </motion.button>
                <button onClick={() => { setShowForm(false); setClientEnEdition(null) }}
                  className="px-6 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">Annuler</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal suppression */}
        <AnimatePresence>
          {clientASupprimer && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.5)' }}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Supprimer ce client ?</h3>
                <p className="text-gray-500 text-sm mb-6">
                  <strong>{clientASupprimer.raison_sociale}</strong> et tous ses dossiers seront supprimés définitivement.
                </p>
                <div className="flex gap-3">
                  <button onClick={supprimerClient} disabled={supprimant}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium bg-red-600 disabled:opacity-50">
                    {supprimant ? 'Suppression...' : 'Supprimer'}
                  </button>
                  <button onClick={() => setClientASupprimer(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">Annuler</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : clientsFiltres.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-400 text-sm">{recherche ? 'Aucun résultat' : 'Aucun client enregistré'}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                    {['Raison sociale', 'NIF', 'Régime', 'Secteur', 'Email', 'Tél.', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientsFiltres.map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-green-50 transition-colors"
                      style={{ background: i % 2 === 0 ? 'white' : '#fafffe' }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                            {c.raison_sociale[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{c.raison_sociale}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 font-mono">{c.nif}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${REGIME_COLORS[c.regime_fiscal]}`}>
                          {REGIME_LABELS[c.regime_fiscal]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{c.secteur_activite}</td>
                      <td className="px-5 py-4 text-sm text-gray-500 truncate max-w-[140px]">{c.email_contact}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{c.telephone || '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5">
                          <button onClick={() => exporterBulletin(c)} disabled={exportingId === c.id}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-50"
                            style={{ background: '#fff8ed', color: '#e8a317' }}>
                            {exportingId === c.id ? '...' : 'Export'}
                          </button>
                          <button onClick={() => ouvrirFormulaire(c)}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                            Modifier
                          </button>
                          <button onClick={() => setClientASupprimer(c)}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-red-50 text-red-600">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {clientsFiltres.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                        {c.raison_sociale[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{c.raison_sociale}</p>
                        <p className="text-xs text-gray-400 font-mono">{c.nif}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${REGIME_COLORS[c.regime_fiscal]}`}>
                      {REGIME_LABELS[c.regime_fiscal]?.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 truncate">{c.email_contact}</p>
                      {c.telephone && <p className="text-xs text-gray-400">{c.telephone}</p>}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 ml-2">
                      <button onClick={() => exporterBulletin(c)} disabled={exportingId === c.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-50"
                        style={{ background: '#fff8ed', color: '#e8a317' }}>
                        {exportingId === c.id ? '...' : 'Export'}
                      </button>
                      <button onClick={() => ouvrirFormulaire(c)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                        Modifier
                      </button>
                      <button onClick={() => setClientASupprimer(c)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600">✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
