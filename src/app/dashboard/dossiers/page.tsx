'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
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
  
  const { data, error } = await supabase.storage
    .from('documents-fiscaux')
    .upload(path, file, { upsert: true })
  
  console.log('Upload data:', data)
  console.log('Upload error:', JSON.stringify(error))
  
  if (error) {
    alert('Erreur upload: ' + error.message)
    setUploading(false)
    return
  }
  
  await supabase.from('documents').insert({
    dossier_id: dossier.id,
    nom_fichier: file.name,
    url_stockage: path,
    type_document: file.type
  })
  await supabase.from('dossiers_fiscaux').update({ statut: 'recu' }).eq('id', dossier.id)
  charger()
  if (fileRef.current) fileRef.current.value = ''
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
      {
        to_email: dossier.clients.email_contact,
        from_name: 'Experts Afrique Conseils',
        message: emailContenu,
      },
      process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
    )
    await supabase.from('relances').insert({
      dossier_id: dossier.id,
      client_id: dossier.client_id,
      contenu_email: emailContenu,
      statut: 'envoye'
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
          <a href="/dashboard/dossiers" className="text-sm font-medium text-blue-600">Dossiers</a>
          <a href="/dashboard/assistant" className="text-sm text-gray-500 hover:text-gray-800">Assistant IA</a>
          <a href="/admin/statistiques" className="text-sm text-gray-500 hover:text-gray-800">Statistiques</a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dossiers fiscaux</h1>
            <p className="text-gray-500 text-sm mt-1">{dossiers.length} dossier(s) au total</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Nouveau dossier
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Nouveau dossier fiscal</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.raison_sociale}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'impôt</label>
                <select value={typeImpot} onChange={e => setTypeImpot(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="TVA">TVA</option>
                  <option value="IRPP">IRPP</option>
                  <option value="IS">Impôt sur les Sociétés</option>
                  <option value="acompte">Acompte</option>
                </select>
              </div>
              {(typeImpot === 'TVA' || typeImpot === 'acompte') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                  <select value={periodeMois} onChange={e => setPeriodeMois(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {MOIS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                <input type="number" value={periodeAnnee} onChange={e => setPeriodeAnnee(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
                <input type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={ajouterDossier} disabled={saving}
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

        {/* Panel dossier actif */}
        {dossierActif && (
          <div className="bg-white rounded-xl border border-blue-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">
                {dossierActif.clients.raison_sociale} — {dossierActif.type_impot} {dossierActif.periode_mois ? MOIS[dossierActif.periode_mois - 1] : ''} {dossierActif.periode_annee}
              </h2>
              <button onClick={() => { setDossierActif(null); setEmailContenu(''); setEmailEnvoye(false) }}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Upload PDF */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Upload justificatif PDF</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
  <input ref={fileRef} type="file" accept=".pdf" className="hidden" id="pdf-upload"
    onChange={e => {
      const f = e.target.files?.[0]
      if (f) {
        const label = document.getElementById('pdf-label')
        if (label) label.textContent = `📄 ${f.name}`
      }
    }}
  />
  <label htmlFor="pdf-upload" className="cursor-pointer">
    <div className="text-3xl mb-2">📄</div>
    <p className="text-sm text-gray-500">Cliquez pour sélectionner un PDF</p>
    <p id="pdf-label" className="text-sm text-blue-600 font-medium mt-1"></p>
  </label>
</div>
                <button onClick={() => uploadPDF(dossierActif)} disabled={uploading}
                  className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {uploading ? 'Upload en cours...' : 'Uploader le PDF'}
                </button>
              </div>

              {/* Email de relance */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Email de relance IA</h3>
                <button onClick={() => genererEmail(dossierActif)} disabled={generatingEmail}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 mb-3">
                  {generatingEmail ? 'Génération en cours...' : '✨ Générer email avec IA'}
                </button>
                {emailContenu && (
                  <>
                    <textarea
                      value={emailContenu}
                      onChange={e => setEmailContenu(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button onClick={() => envoyerEmail(dossierActif)} disabled={sendingEmail || emailEnvoye}
                      className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                      {sendingEmail ? 'Envoi...' : emailEnvoye ? '✓ Email envoyé' : 'Envoyer au client'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : dossiers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">Aucun dossier pour l'instant</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Période</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Échéance</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dossiers.map(d => (
                  <tr key={d.id} className={`hover:bg-gray-50 ${estEnRetard(d.date_echeance) && d.statut !== 'televerse_otr' ? 'bg-red-50' : estUrgent(d.date_echeance) ? 'bg-yellow-50' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{d.clients?.raison_sociale}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{d.type_impot}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {d.periode_mois ? `${MOIS[d.periode_mois - 1]} ` : ''}{d.periode_annee}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={estEnRetard(d.date_echeance) && d.statut !== 'televerse_otr' ? 'text-red-600 font-medium' : estUrgent(d.date_echeance) ? 'text-yellow-600 font-medium' : 'text-gray-500'}>
                        {new Date(d.date_echeance).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUT_COULEURS[d.statut]}`}>
                        {STATUT_LABELS[d.statut]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select value={d.statut} onChange={e => changerStatut(d.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none">
                        <option value="en_attente">En attente</option>
                        <option value="recu">Reçu</option>
                        <option value="valide">Validé</option>
                        <option value="televerse_otr">Téléversé OTR</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => { setDossierActif(d); setEmailContenu(''); setEmailEnvoye(false) }}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-lg">
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