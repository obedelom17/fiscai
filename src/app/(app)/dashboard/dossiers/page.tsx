'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import emailjs from '@emailjs/browser'
import { motion, AnimatePresence } from 'framer-motion'

type Client = { id: string; raison_sociale: string; email_contact: string }
type Dossier = {
  id: string
  client_id: string
  type_impot: string
  periode_mois: number | null
  periode_annee: number
  statut: string
  date_echeance: string
  clients: { raison_sociale: string; email_contact: string }
  collaborateurs: { nom: string; prenom: string } | null
}
type Relance = {
  id: string
  contenu_email: string
  date_envoi: string
  statut: string
  clients: { raison_sociale: string }
  dossiers_fiscaux: { type_impot: string; periode_mois: number | null; periode_annee: number }
}

const STATUT_COULEURS: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  recu: 'bg-blue-100 text-blue-700',
  valide: 'bg-green-100 text-green-700',
  televerse_otr: 'bg-purple-100 text-purple-700',
}

const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  recu: 'Reçu',
  valide: 'Validé',
  televerse_otr: 'Téléversé OTR',
}

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [relances, setRelances] = useState<Relance[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'dossiers' | 'historique'>('dossiers')
  const [showForm, setShowForm] = useState(false)
  const [dossierEnEdition, setDossierEnEdition] = useState<Dossier | null>(null)
  const [dossierASupprimer, setDossierASupprimer] = useState<Dossier | null>(null)
  const [clientId, setClientId] = useState('')
  const [typeImpot, setTypeImpot] = useState('TVA')
  const [periodeMois, setPeriodeMois] = useState(1)
  const [periodeAnnee, setPeriodeAnnee] = useState(2026)
  const [dateEcheance, setDateEcheance] = useState('')
  const [saving, setSaving] = useState(false)
  const [supprimant, setSupprimant] = useState(false)
  const [dossierActif, setDossierActif] = useState<Dossier | null>(null)
  const [uploading, setUploading] = useState(false)
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [emailContenu, setEmailContenu] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailEnvoye, setEmailEnvoye] = useState(false)
  const [fichierNom, setFichierNom] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { charger() }, [])

  async function charger() {
    const { data: d } = await supabase
      .from('dossiers_fiscaux')
      .select('*, clients(raison_sociale, email_contact), collaborateurs(nom, prenom)')
      .order('date_echeance', { ascending: true })
    const { data: c } = await supabase.from('clients').select('id, raison_sociale, email_contact')
    const { data: r } = await supabase
      .from('relances')
      .select('*, clients(raison_sociale), dossiers_fiscaux(type_impot, periode_mois, periode_annee)')
      .order('date_envoi', { ascending: false })
    setDossiers(d || [])
    setClients(c || [])
    setRelances(r || [])
    setLoading(false)
  }

  function ouvrirFormulaire(dossier?: Dossier) {
    if (dossier) {
      setDossierEnEdition(dossier)
      setClientId(dossier.client_id)
      setTypeImpot(dossier.type_impot)
      setPeriodeMois(dossier.periode_mois || 1)
      setPeriodeAnnee(dossier.periode_annee)
      setDateEcheance(dossier.date_echeance.split('T')[0])
    } else {
      setDossierEnEdition(null)
      setClientId(''); setTypeImpot('TVA'); setPeriodeMois(1); setPeriodeAnnee(2026); setDateEcheance('')
    }
    setShowForm(true)
  }

  async function sauvegarderDossier() {
    setSaving(true)
    const payload = {
      client_id: clientId,
      type_impot: typeImpot,
      periode_mois: typeImpot === 'TVA' || typeImpot === 'acompte' ? periodeMois : null,
      periode_annee: periodeAnnee,
      date_echeance: dateEcheance,
    }
    if (dossierEnEdition) {
      await supabase.from('dossiers_fiscaux').update(payload).eq('id', dossierEnEdition.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('dossiers_fiscaux').insert({ ...payload, statut: 'en_attente', collaborateur_id: user?.id })
    }
    setShowForm(false)
    setDossierEnEdition(null)
    charger()
    setSaving(false)
  }

  async function supprimerDossier() {
    if (!dossierASupprimer) return
    setSupprimant(true)
    await supabase.from('dossiers_fiscaux').delete().eq('id', dossierASupprimer.id)
    setDossierASupprimer(null)
    charger()
    setSupprimant(false)
  }

  async function changerStatut(id: string, statut: string) {
    await supabase.from('dossiers_fiscaux').update({ statut }).eq('id', id)
    charger()
  }

  async function uploadPDF(dossier: Dossier) {
    const file = fileRef.current?.files?.[0]
    if (!file) { alert('Aucun fichier sélectionné'); return }
    setUploading(true)
    const path = `${dossier.id}/${file.name}`
    const { error } = await supabase.storage.from('documents-fiscaux').upload(path, file, { upsert: true })
    if (error) { alert('Erreur upload: ' + error.message); setUploading(false); return }
    await supabase.from('documents').insert({
      dossier_id: dossier.id, nom_fichier: file.name, url_stockage: path, type_document: file.type
    })
    await supabase.from('dossiers_fiscaux').update({ statut: 'recu', date_depot: new Date().toISOString() }).eq('id', dossier.id)
    charger()
    if (fileRef.current) fileRef.current.value = ''
    setFichierNom('')
    setUploading(false)
  }

  async function genererEmail(dossier: Dossier) {
    setGeneratingEmail(true)
    setEmailEnvoye(false)
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Rédige un email de relance professionnel en français pour demander les documents fiscaux manquants à l'entreprise "${dossier.clients.raison_sociale}". Il s'agit de leur déclaration ${dossier.type_impot} ${dossier.periode_mois ? `du mois ${MOIS[dossier.periode_mois - 1]}` : ''} ${dossier.periode_annee}. L'échéance OTR est le ${new Date(dossier.date_echeance).toLocaleDateString('fr-FR')}. Sois professionnel, concis et urgent sans être agressif. Ne mets pas de signature.`,
        contexte: ''
      })
    })
    const data = await res.json()
    setEmailContenu(data.reponse)
    setGeneratingEmail(false)
  }

  async function envoyerEmail(dossier: Dossier) {
    setSendingEmail(true)
    await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
      process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
      { to_email: dossier.clients.email_contact, from_name: 'Experts Afrique Conseils', message: emailContenu },
      process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
    )
    await supabase.from('relances').insert({
      dossier_id: dossier.id, client_id: dossier.client_id, contenu_email: emailContenu, statut: 'envoye'
    })
    setEmailEnvoye(true)
    setSendingEmail(false)
  }

  const aujourd = new Date()
  const dans5 = new Date()
  dans5.setDate(dans5.getDate() + 5)

  function estUrgent(date: string) {
    const d = new Date(date)
    return d <= dans5 && d >= aujourd
  }

  function estEnRetard(date: string) {
    return new Date(date) < aujourd
  }

  const dossiersFiltres = filtreStatut === 'tous' ? dossiers : dossiers.filter(d => d.statut === filtreStatut)

  const stats = {
    total: dossiers.length,
    en_attente: dossiers.filter(d => d.statut === 'en_attente').length,
    recu: dossiers.filter(d => d.statut === 'recu').length,
    valide: dossiers.filter(d => d.statut === 'valide' || d.statut === 'televerse_otr').length,
    urgents: dossiers.filter(d => estUrgent(d.date_echeance) && d.statut !== 'televerse_otr').length,
  }

  return (
    <div style={{ background: '#f0f4f1' }}>
      <PageHeader
        titre="Dossiers Fiscaux"
        sousTitre="Suivi des obligations fiscales — OTR Togo"
        imageUrl="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80"
        bouton={
          <motion.button onClick={() => ouvrirFormulaire()}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="px-5 py-2.5 rounded-xl text-white font-medium shadow-lg"
            style={{ background: 'linear-gradient(135deg, #e8a317, #d4940f)' }}>
            + Nouveau dossier
          </motion.button>
        }
      />

      <div className="px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total dossiers', value: stats.total, color: '#1a3c2e' },
            { label: 'En attente', value: stats.en_attente, color: '#d97706' },
            { label: 'Reçus', value: stats.recu, color: '#3b82f6' },
            { label: 'Validés', value: stats.valide, color: '#2d6a4f' },
          ].map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-default">
              <p className="text-xs text-gray-500 uppercase font-medium">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Alerte urgences */}
        <AnimatePresence>
          {stats.urgents > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-2xl border flex items-center gap-3"
              style={{ background: '#fff8ed', borderColor: '#fcd34d' }}>
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
              <p className="text-sm font-medium text-yellow-800">
                {stats.urgents} dossier(s) avec échéance dans moins de 5 jours — Action requise
              </p>
            </motion.div>
          )}
        </AnimatePresence>

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
                <h2 className="text-lg font-bold" style={{ color: '#1a3c2e' }}>
                  {dossierEnEdition ? 'Modifier le dossier' : 'Nouveau dossier fiscal'}
                </h2>
                <motion.button whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}
                  onClick={() => { setShowForm(false); setDossierEnEdition(null) }}
                  className="text-gray-400 hover:text-gray-600 text-xl">✕</motion.button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Client</label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Sélectionner un client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.raison_sociale}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Type d'impôt</label>
                  <select value={typeImpot} onChange={e => setTypeImpot(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="TVA">TVA</option>
                    <option value="IRPP">IRPP</option>
                    <option value="IS">Impôt sur les Sociétés</option>
                    <option value="acompte">Acompte</option>
                  </select>
                </div>
                {(typeImpot === 'TVA' || typeImpot === 'acompte') && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Mois</label>
                    <select value={periodeMois} onChange={e => setPeriodeMois(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </motion.div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Année</label>
                  <input type="number" value={periodeAnnee} onChange={e => setPeriodeAnnee(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Date d'échéance</label>
                  <input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <motion.button onClick={sauvegarderDossier} disabled={saving}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                  {saving ? 'Enregistrement...' : dossierEnEdition ? 'Modifier' : 'Enregistrer'}
                </motion.button>
                <motion.button onClick={() => { setShowForm(false); setDossierEnEdition(null) }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">
                  Annuler
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal suppression */}
        <AnimatePresence>
          {dossierASupprimer && (
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
                <h3 className="text-lg font-bold text-gray-800 mb-2">Supprimer ce dossier ?</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Le dossier <strong>{dossierASupprimer.type_impot}</strong> de <strong>{dossierASupprimer.clients?.raison_sociale}</strong> sera supprimé définitivement.
                </p>
                <div className="flex gap-3">
                  <motion.button onClick={supprimerDossier} disabled={supprimant}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium bg-red-600 disabled:opacity-50">
                    {supprimant ? 'Suppression...' : 'Supprimer'}
                  </motion.button>
                  <motion.button onClick={() => setDossierASupprimer(null)}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">
                    Annuler
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panel dossier actif */}
        <AnimatePresence>
          {dossierActif && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border-l-4 p-6 mb-6"
              style={{ borderLeftColor: '#2d6a4f' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-gray-800">{dossierActif.clients.raison_sociale}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {dossierActif.type_impot} — {dossierActif.periode_mois ? MOIS[dossierActif.periode_mois - 1] + ' ' : ''}{dossierActif.periode_annee} — Échéance : {new Date(dossierActif.date_echeance).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <motion.button whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}
                  onClick={() => { setDossierActif(null); setEmailContenu(''); setEmailEnvoye(false); setFichierNom('') }}
                  className="text-gray-400 hover:text-gray-600 text-xl">✕</motion.button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Justificatif PDF</h3>
                  <motion.label htmlFor="pdf-upload"
                    whileHover={{ borderColor: '#2d6a4f', background: '#f0f9f4' }}
                    className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                    style={{ borderColor: fichierNom ? '#2d6a4f' : '#d1d5db', background: fichierNom ? '#f0f9f4' : 'white' }}>
                    <input ref={fileRef} type="file" accept=".pdf" className="hidden" id="pdf-upload"
                      onChange={e => setFichierNom(e.target.files?.[0]?.name || '')} />
                    <motion.div animate={{ scale: fichierNom ? 1.1 : 1 }}
                      className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: fichierNom ? '#2d6a4f' : '#f3f4f6' }}>
                      <svg className="w-5 h-5" fill="none" stroke={fichierNom ? 'white' : '#9ca3af'} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </motion.div>
                    {fichierNom ? (
                      <p className="text-sm font-medium" style={{ color: '#2d6a4f' }}>{fichierNom}</p>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">Cliquez pour sélectionner</p>
                        <p className="text-xs text-gray-400 mt-1">Format PDF uniquement</p>
                      </>
                    )}
                  </motion.label>
                  <motion.button onClick={() => uploadPDF(dossierActif)} disabled={uploading || !fichierNom}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="mt-3 w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                    {uploading ? 'Upload en cours...' : 'Uploader le document'}
                  </motion.button>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Email de relance IA</h3>
                  <motion.button onClick={() => genererEmail(dossierActif)} disabled={generatingEmail}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 mb-3"
                    style={{ background: 'linear-gradient(135deg, #e8a317, #d4940f)' }}>
                    {generatingEmail ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Génération en cours...
                      </span>
                    ) : "Générer avec l'IA Groq"}
                  </motion.button>
                  <AnimatePresence>
                    {emailContenu && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}>
                        <textarea value={emailContenu} onChange={e => setEmailContenu(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-36 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                        <motion.button onClick={() => envoyerEmail(dossierActif)} disabled={sendingEmail || emailEnvoye}
                          whileHover={{ scale: emailEnvoye ? 1 : 1.02 }}
                          whileTap={{ scale: emailEnvoye ? 1 : 0.98 }}
                          className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
                          style={emailEnvoye
                            ? { background: '#f0f9f4', color: '#2d6a4f', border: '1px solid #2d6a4f' }
                            : { background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)', color: 'white' }}>
                          {sendingEmail ? 'Envoi en cours...' : emailEnvoye ? 'Email envoyé avec succès' : 'Envoyer au client'}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'dossiers', label: 'Dossiers fiscaux' },
            { key: 'historique', label: `Historique des relances (${relances.length})` },
          ].map(o => (
            <motion.button key={o.key} onClick={() => setOnglet(o.key as any)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={onglet === o.key
                ? { background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)', color: 'white' }
                : { background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              {o.label}
            </motion.button>
          ))}
        </div>

        {/* Filtres + Table dossiers */}
        {onglet === 'dossiers' && (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: 'tous', label: 'Tous' },
                { key: 'en_attente', label: 'En attente' },
                { key: 'recu', label: 'Reçus' },
                { key: 'valide', label: 'Validés' },
                { key: 'televerse_otr', label: 'Téléversés OTR' },
              ].map(f => (
                <motion.button key={f.key} onClick={() => setFiltreStatut(f.key)}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
                  style={filtreStatut === f.key
                    ? { background: '#1a3c2e', color: 'white' }
                    : { background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  {f.label}
                </motion.button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 rounded-full border-2"
                  style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
              </div>
            ) : dossiersFiltres.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400 text-sm">Aucun dossier pour ce filtre</p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                      {['Client', 'Type', 'Période', 'Échéance', 'Statut', 'Modifier', 'Actions'].map(h => (
                        <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {dossiersFiltres.map((d, i) => (
                        <motion.tr key={d.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.04 }}
                          className="border-b border-gray-50 hover:bg-green-50 transition-colors"
                          style={{
                            background: estEnRetard(d.date_echeance) && d.statut !== 'televerse_otr'
                              ? '#fff8f8' : estUrgent(d.date_echeance) ? '#fffbeb'
                              : i % 2 === 0 ? 'white' : '#fafffe'
                          }}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                                {d.clients?.raison_sociale[0]}
                              </div>
                              <span className="text-sm font-medium text-gray-800">{d.clients?.raison_sociale}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                              style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                              {d.type_impot}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {d.periode_mois ? `${MOIS[d.periode_mois - 1]} ` : ''}{d.periode_annee}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={estEnRetard(d.date_echeance) && d.statut !== 'televerse_otr'
                              ? 'text-red-600 font-semibold' : estUrgent(d.date_echeance)
                              ? 'text-yellow-600 font-semibold' : 'text-gray-500'}>
                              {new Date(d.date_echeance).toLocaleDateString('fr-FR')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUT_COULEURS[d.statut]}`}>
                              {STATUT_LABELS[d.statut]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <select value={d.statut} onChange={e => changerStatut(d.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white">
                              <option value="en_attente">En attente</option>
                              <option value="recu">Reçu</option>
                              <option value="valide">Validé</option>
                              <option value="televerse_otr">Téléversé OTR</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <motion.button
                                onClick={() => { setDossierActif(d); setEmailContenu(''); setEmailEnvoye(false); setFichierNom('') }}
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                                style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                                Gérer
                              </motion.button>
                              <motion.button
                                onClick={() => ouvrirFormulaire(d)}
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                                style={{ background: '#eff6ff', color: '#3b82f6' }}>
                                Modifier
                              </motion.button>
                              <motion.button
                                onClick={() => setDossierASupprimer(d)}
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
          </>
        )}

        {/* Historique relances */}
        {onglet === 'historique' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {relances.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400 text-sm">Aucune relance envoyée pour l'instant</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                      {['Client', 'Dossier', 'Date envoi', 'Statut', 'Aperçu email'].map(h => (
                        <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {relances.map((r, i) => (
                      <motion.tr key={r.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-gray-50 hover:bg-green-50 transition-colors"
                        style={{ background: i % 2 === 0 ? 'white' : '#fafffe' }}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                              {r.clients?.raison_sociale?.[0]}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{r.clients?.raison_sociale}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                            style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                            {r.dossiers_fiscaux?.type_impot}
                            {r.dossiers_fiscaux?.periode_mois ? ` — ${MOIS[r.dossiers_fiscaux.periode_mois - 1]}` : ''}
                            {` ${r.dossiers_fiscaux?.periode_annee}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(r.date_envoi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700">
                            {r.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 max-w-xs">
                          <p className="truncate">{r.contenu_email?.substring(0, 60)}...</p>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  )
}