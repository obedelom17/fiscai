'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import emailjs from '@emailjs/browser'

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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [clientId, setClientId] = useState('')
  const [typeImpot, setTypeImpot] = useState('TVA')
  const [periodeMois, setPeriodeMois] = useState(1)
  const [periodeAnnee, setPeriodeAnnee] = useState(2026)
  const [dateEcheance, setDateEcheance] = useState('')
  const [saving, setSaving] = useState(false)
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
    setDossiers(d || [])
    setClients(c || [])
    setLoading(false)
  }

  async function ajouterDossier() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('dossiers_fiscaux').insert({
      client_id: clientId,
      type_impot: typeImpot,
      periode_mois: typeImpot === 'TVA' || typeImpot === 'acompte' ? periodeMois : null,
      periode_annee: periodeAnnee,
      statut: 'en_attente',
      date_echeance: dateEcheance,
      collaborateur_id: user?.id
    })
    setShowForm(false)
    charger()
    setSaving(false)
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
    await supabase.from('dossiers_fiscaux').update({ statut: 'recu' }).eq('id', dossier.id)
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
    <div className="min-h-screen" style={{ background: '#f0f4f1' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#1a3c2e' }}>Dossiers Fiscaux</h1>
            <p className="text-gray-500 mt-1">Suivi des obligations fiscales — OTR Togo</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl text-white font-medium shadow-lg hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
            + Nouveau dossier
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total dossiers', value: stats.total, color: '#1a3c2e' },
            { label: 'En attente', value: stats.en_attente, color: '#d97706' },
            { label: 'Reçus', value: stats.recu, color: '#3b82f6' },
            { label: 'Validés', value: stats.valide, color: '#2d6a4f' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-medium">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Alerte urgences */}
        {stats.urgents > 0 && (
          <div className="mb-6 p-4 rounded-2xl border flex items-center gap-3"
            style={{ background: '#fff8ed', borderColor: '#fcd34d' }}>
            <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0"></div>
            <p className="text-sm font-medium text-yellow-800">
              {stats.urgents} dossier(s) avec échéance dans moins de 5 jours — Action requise
            </p>
          </div>
        )}

        {/* Formulaire */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#1a3c2e' }}>Nouveau dossier fiscal</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
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
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Mois</label>
                  <select value={periodeMois} onChange={e => setPeriodeMois(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
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
              <button onClick={ajouterDossier} disabled={saving}
                className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Panel dossier actif */}
        {dossierActif && (
          <div className="bg-white rounded-2xl shadow-lg border-l-4 p-6 mb-6" style={{ borderLeftColor: '#2d6a4f' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-800">
                  {dossierActif.clients.raison_sociale}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {dossierActif.type_impot} — {dossierActif.periode_mois ? MOIS[dossierActif.periode_mois - 1] + ' ' : ''}{dossierActif.periode_annee} — Échéance : {new Date(dossierActif.date_echeance).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button onClick={() => { setDossierActif(null); setEmailContenu(''); setEmailEnvoye(false); setFichierNom('') }}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Upload PDF */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Justificatif PDF</h3>
                <label htmlFor="pdf-upload"
                  className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-green-400"
                  style={{ borderColor: fichierNom ? '#2d6a4f' : '#d1d5db', background: fichierNom ? '#f0f9f4' : 'white' }}>
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden" id="pdf-upload"
                    onChange={e => setFichierNom(e.target.files?.[0]?.name || '')} />
                  <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: fichierNom ? '#2d6a4f' : '#f3f4f6' }}>
                    <svg className="w-5 h-5" fill="none" stroke={fichierNom ? 'white' : '#9ca3af'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  {fichierNom ? (
                    <p className="text-sm font-medium" style={{ color: '#2d6a4f' }}>{fichierNom}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Cliquez pour sélectionner</p>
                      <p className="text-xs text-gray-400 mt-1">Format PDF uniquement</p>
                    </>
                  )}
                </label>
                <button onClick={() => uploadPDF(dossierActif)} disabled={uploading || !fichierNom}
                  className="mt-3 w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                  {uploading ? 'Upload en cours...' : 'Uploader le document'}
                </button>
              </div>

              {/* Email relance */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Email de relance IA</h3>
                <button onClick={() => genererEmail(dossierActif)} disabled={generatingEmail}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 mb-3"
                  style={{ background: 'linear-gradient(135deg, #e8a317, #d4940f)' }}>
                  {generatingEmail ? 'Génération en cours...' : 'Générer avec l\'IA Groq'}
                </button>
                {emailContenu && (
                  <>
                    <textarea value={emailContenu} onChange={e => setEmailContenu(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-36 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                    <button onClick={() => envoyerEmail(dossierActif)} disabled={sendingEmail || emailEnvoye}
                      className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
                      style={emailEnvoye
                        ? { background: '#f0f9f4', color: '#2d6a4f', border: '1px solid #2d6a4f' }
                        : { background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)', color: 'white' }}>
                      {sendingEmail ? 'Envoi en cours...' : emailEnvoye ? 'Email envoyé avec succes' : 'Envoyer au client'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'tous', label: 'Tous' },
            { key: 'en_attente', label: 'En attente' },
            { key: 'recu', label: 'Reçus' },
            { key: 'valide', label: 'Validés' },
            { key: 'televerse_otr', label: 'Téléversés OTR' },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltreStatut(f.key)}
              className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
              style={filtreStatut === f.key
                ? { background: '#1a3c2e', color: 'white' }
                : { background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Chargement...</div>
        ) : dossiersFiltres.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-400 text-sm">Aucun dossier pour ce filtre</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                  {['Client', 'Type', 'Période', 'Échéance', 'Statut', 'Modifier', 'Actions'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dossiersFiltres.map((d, i) => (
                  <tr key={d.id}
                    className="border-b border-gray-50 hover:bg-green-50 transition-colors"
                    style={{
                      background: estEnRetard(d.date_echeance) && d.statut !== 'televerse_otr'
                        ? '#fff8f8'
                        : estUrgent(d.date_echeance) ? '#fffbeb'
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
                      <span className={
                        estEnRetard(d.date_echeance) && d.statut !== 'televerse_otr'
                          ? 'text-red-600 font-semibold'
                          : estUrgent(d.date_echeance) ? 'text-yellow-600 font-semibold'
                          : 'text-gray-500'
                      }>
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
                      <button onClick={() => { setDossierActif(d); setEmailContenu(''); setEmailEnvoye(false); setFichierNom('') }}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                        style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                        Gérer
                      </button>
                    </td>
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