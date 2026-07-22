'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import { motion, AnimatePresence } from 'framer-motion'

type Client = { id: string; raison_sociale: string; email_contact: string; telephone?: string }
type Dossier = {
  id: string
  client_id: string
  type_impot: string
  periode_mois: number | null
  periode_annee: number
  statut: string
  date_echeance: string
  clients: { raison_sociale: string; email_contact: string; telephone?: string }
  collaborateurs: { nom: string; prenom: string } | null
}
type Relance = {
  id: string
  contenu_email: string
  date_envoi: string
  statut: string
  canal?: string
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
  const [periodeAnnee, setPeriodeAnnee] = useState(new Date().getFullYear())
  const [dateEcheance, setDateEcheance] = useState('')
  const [saving, setSaving] = useState(false)
  const [supprimant, setSupprimant] = useState(false)
  const [dossierActif, setDossierActif] = useState<Dossier | null>(null)
  const [uploading, setUploading] = useState(false)
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [emailContenu, setEmailContenu] = useState('')
  const [sendingRelance, setSendingRelance] = useState(false)
  const [relanceEnvoyee, setRelanceEnvoyee] = useState<'email' | 'whatsapp' | null>(null)
  const [fichierNom, setFichierNom] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [canalRelance, setCanalRelance] = useState<'email' | 'whatsapp'>('email')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { charger() }, [])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('dossiers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers_fiscaux' }, () => charger())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function charger() {
    try {
      const [{ data: d }, { data: c }, { data: r }] = await Promise.all([
        supabase.from('dossiers_fiscaux').select('*, clients(raison_sociale, email_contact, telephone), collaborateurs(nom, prenom)').order('date_echeance', { ascending: true }),
        supabase.from('clients').select('id, raison_sociale, email_contact, telephone'),
        supabase.from('relances').select('*, clients(raison_sociale), dossiers_fiscaux(type_impot, periode_mois, periode_annee)').order('date_envoi', { ascending: false }),
      ])
      setDossiers(d || [])
      setClients(c || [])
      setRelances(r || [])
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false)
    }
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
      setClientId(''); setTypeImpot('TVA'); setPeriodeMois(1); setPeriodeAnnee(new Date().getFullYear()); setDateEcheance('')
    }
    setShowForm(true)
  }

  async function sauvegarderDossier() {
    if (!clientId || !dateEcheance) return
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
    setShowForm(false); setDossierEnEdition(null)
    charger(); setSaving(false)
  }

  async function supprimerDossier() {
    if (!dossierASupprimer) return
    setSupprimant(true)
    await supabase.from('dossiers_fiscaux').delete().eq('id', dossierASupprimer.id)
    setDossierASupprimer(null); charger(); setSupprimant(false)
  }

  async function changerStatut(id: string, statut: string) {
    await supabase.from('dossiers_fiscaux').update({ statut }).eq('id', id)
    charger()
  }

  async function uploadPDF(dossier: Dossier) {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${dossier.id}/${file.name}`
    const { error } = await supabase.storage.from('documents-fiscaux').upload(path, file, { upsert: true })
    if (error) { alert('Erreur upload: ' + error.message); setUploading(false); return }
    await supabase.from('documents').insert({ dossier_id: dossier.id, nom_fichier: file.name, url_stockage: path, type_document: file.type })
    await supabase.from('dossiers_fiscaux').update({ statut: 'recu', date_depot: new Date().toISOString() }).eq('id', dossier.id)
    charger()
    if (fileRef.current) fileRef.current.value = ''
    setFichierNom(''); setUploading(false)
  }

  async function genererContenu(dossier: Dossier) {
    setGeneratingEmail(true)
    setRelanceEnvoyee(null)
    const isWA = canalRelance === 'whatsapp'
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Rédige un ${isWA ? 'message WhatsApp' : 'email'} de relance professionnel en français pour demander les documents fiscaux manquants à l'entreprise "${dossier.clients.raison_sociale}". Il s'agit de leur déclaration ${dossier.type_impot}${dossier.periode_mois ? ` du mois ${MOIS[dossier.periode_mois - 1]}` : ''} ${dossier.periode_annee}. L'échéance OTR est le ${new Date(dossier.date_echeance).toLocaleDateString('fr-FR')}. ${isWA ? 'Format court, direct, adapté WhatsApp, sans mise en forme HTML.' : 'Sois professionnel, concis et urgent sans être agressif.'} Ne mets pas de signature.`,
        contexte: ''
      })
    })
    const data = await res.json()
    setEmailContenu(data.reponse || '')
    setGeneratingEmail(false)
  }

  async function envoyerRelance(dossier: Dossier) {
    if (!emailContenu.trim()) return
    setSendingRelance(true)

    try {
      if (canalRelance === 'whatsapp') {
        const tel = (dossier.clients.telephone || '').replace(/[^0-9]/g, '')
        const msg = encodeURIComponent(emailContenu)
        if (tel) {
          window.open(`https://wa.me/${tel}?text=${msg}`, '_blank')
        } else {
          await navigator.clipboard.writeText(emailContenu)
          alert('Numéro non renseigné — message copié dans le presse-papier')
        }
        await supabase.from('relances').insert({
          dossier_id: dossier.id,
          client_id: dossier.client_id,
          contenu_email: emailContenu,
          statut: 'envoye_whatsapp',
          canal: 'whatsapp',
        })
        setRelanceEnvoyee('whatsapp')
      } else {
        const emailjs = (await import('@emailjs/browser')).default
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
          statut: 'envoye',
          canal: 'email',
        })
        setRelanceEnvoyee('email')
      }
    } catch (err: any) {
      alert('Erreur envoi : ' + (err?.message || 'Vérifiez vos clés EmailJS'))
    } finally {
      setSendingRelance(false)
      charger()
    }
  }

  const aujourd = new Date()
  const dans5 = new Date(); dans5.setDate(dans5.getDate() + 5)
  const estUrgent = (date: string) => { const d = new Date(date); return d <= dans5 && d >= aujourd }
  const estEnRetard = (date: string) => new Date(date) < aujourd

  const dossiersFiltres = filtreStatut === 'tous' ? dossiers : dossiers.filter(d => d.statut === filtreStatut)
  const stats = {
    total: dossiers.length,
    en_attente: dossiers.filter(d => d.statut === 'en_attente').length,
    recu: dossiers.filter(d => d.statut === 'recu').length,
    valide: dossiers.filter(d => d.statut === 'valide' || d.statut === 'televerse_otr').length,
    urgents: dossiers.filter(d => estUrgent(d.date_echeance) && d.statut !== 'televerse_otr').length,
  }

  return (
    <div style={{ background: '#f0f4f1', minHeight: '100vh' }}>
      <PageHeader
        titre="Dossiers Fiscaux"
        sousTitre="Suivi des obligations fiscales — OTR Togo"
        imageUrl="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80"
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
            { label: 'Total', value: stats.total, color: '#1a3c2e' },
            { label: 'En attente', value: stats.en_attente, color: '#d97706' },
            { label: 'Reçus', value: stats.recu, color: '#3b82f6' },
            { label: 'Validés', value: stats.valide, color: '#2d6a4f' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-medium">{s.label}</p>
              <p className="text-2xl md:text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Alerte urgences */}
        <AnimatePresence>
          {stats.urgents > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-4 rounded-2xl border flex items-center gap-3"
              style={{ background: '#fff8ed', borderColor: '#fcd34d' }}>
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
              <p className="text-sm font-medium text-yellow-800">
                {stats.urgents} dossier(s) avec échéance dans moins de 5 jours
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 md:p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base md:text-lg font-bold" style={{ color: '#1a3c2e' }}>
                  {dossierEnEdition ? 'Modifier le dossier' : 'Nouveau dossier fiscal'}
                </h2>
                <button onClick={() => { setShowForm(false); setDossierEnEdition(null) }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <motion.button onClick={sauvegarderDossier} disabled={saving || !clientId || !dateEcheance}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                  {saving ? 'Enregistrement...' : dossierEnEdition ? 'Modifier' : 'Enregistrer'}
                </motion.button>
                <button onClick={() => { setShowForm(false); setDossierEnEdition(null) }}
                  className="px-6 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">
                  Annuler
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal suppression */}
        <AnimatePresence>
          {dossierASupprimer && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.5)' }}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Supprimer ce dossier ?</h3>
                <p className="text-gray-500 text-sm mb-6">
                  <strong>{dossierASupprimer.type_impot}</strong> de <strong>{dossierASupprimer.clients?.raison_sociale}</strong> sera supprimé définitivement.
                </p>
                <div className="flex gap-3">
                  <button onClick={supprimerDossier} disabled={supprimant}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium bg-red-600 disabled:opacity-50">
                    {supprimant ? 'Suppression...' : 'Supprimer'}
                  </button>
                  <button onClick={() => setDossierASupprimer(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">
                    Annuler
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panel dossier actif */}
        <AnimatePresence>
          {dossierActif && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg border-l-4 p-5 md:p-6 mb-6"
              style={{ borderLeftColor: '#2d6a4f' }}>
              <div className="flex items-start justify-between mb-5 gap-4">
                <div>
                  <h2 className="font-bold text-gray-800">{dossierActif.clients.raison_sociale}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {dossierActif.type_impot} — {dossierActif.periode_mois ? MOIS[dossierActif.periode_mois - 1] + ' ' : ''}{dossierActif.periode_annee} — Échéance : {new Date(dossierActif.date_echeance).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button onClick={() => { setDossierActif(null); setEmailContenu(''); setRelanceEnvoyee(null); setFichierNom('') }}
                  className="text-gray-400 hover:text-gray-600 text-xl flex-shrink-0">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload PDF */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Justificatif PDF</h3>
                  <label htmlFor="pdf-upload"
                    className="block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
                    style={{ borderColor: fichierNom ? '#2d6a4f' : '#d1d5db', background: fichierNom ? '#f0f9f4' : 'white' }}>
                    <input ref={fileRef} type="file" accept=".pdf" className="hidden" id="pdf-upload"
                      onChange={e => setFichierNom(e.target.files?.[0]?.name || '')} />
                    <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                      style={{ background: fichierNom ? '#2d6a4f' : '#f3f4f6' }}>
                      <svg className="w-5 h-5" fill="none" stroke={fichierNom ? 'white' : '#9ca3af'} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    {fichierNom
                      ? <p className="text-sm font-medium" style={{ color: '#2d6a4f' }}>{fichierNom}</p>
                      : <><p className="text-sm text-gray-500">Cliquez pour sélectionner</p><p className="text-xs text-gray-400 mt-1">PDF uniquement</p></>
                    }
                  </label>
                  <button onClick={() => uploadPDF(dossierActif)} disabled={uploading || !fichierNom}
                    className="mt-3 w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                    {uploading ? 'Upload...' : 'Uploader le document'}
                  </button>
                </div>

                {/* Relance IA */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Relance IA</h3>

                  {/* Canal selector */}
                  <div className="flex gap-2 mb-3">
                    {(['email', 'whatsapp'] as const).map(canal => (
                      <button key={canal} onClick={() => { setCanalRelance(canal); setEmailContenu(''); setRelanceEnvoyee(null) }}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border"
                        style={canalRelance === canal
                          ? { background: canal === 'whatsapp' ? '#25D366' : '#2d6a4f', color: 'white', borderColor: 'transparent' }
                          : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                        {canal === 'whatsapp' ? (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                        {canal === 'whatsapp' ? 'WhatsApp' : 'Email'}
                      </button>
                    ))}
                  </div>

                  <button onClick={() => genererContenu(dossierActif)} disabled={generatingEmail}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 mb-3"
                    style={{ background: 'linear-gradient(135deg, #e8a317, #d4940f)' }}>
                    {generatingEmail ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Génération...
                      </span>
                    ) : `Générer le message IA`}
                  </button>

                  <AnimatePresence>
                    {emailContenu && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <textarea value={emailContenu} onChange={e => setEmailContenu(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none mb-2" />

                        {canalRelance === 'whatsapp' && !dossierActif.clients.telephone && (
                          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-2">
                            ⚠️ Numéro non renseigné pour ce client — le message sera copié dans le presse-papier
                          </p>
                        )}

                        <button onClick={() => envoyerRelance(dossierActif)} disabled={sendingRelance || !!relanceEnvoyee}
                          className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                          style={relanceEnvoyee
                            ? { background: '#f0f9f4', color: '#2d6a4f', border: '1px solid #2d6a4f' }
                            : canalRelance === 'whatsapp'
                              ? { background: '#25D366', color: 'white' }
                              : { background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)', color: 'white' }}>
                          {sendingRelance ? 'Envoi...' :
                            relanceEnvoyee === 'email' ? '✓ Email envoyé' :
                            relanceEnvoyee === 'whatsapp' ? '✓ WhatsApp ouvert' :
                            canalRelance === 'whatsapp' ? 'Ouvrir WhatsApp' : 'Envoyer par email'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Onglets */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[
            { key: 'dossiers', label: 'Dossiers fiscaux' },
            { key: 'historique', label: `Relances (${relances.length})` },
          ].map(o => (
            <button key={o.key} onClick={() => setOnglet(o.key as any)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
              style={onglet === o.key
                ? { background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)', color: 'white' }
                : { background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* Filtres */}
        {onglet === 'dossiers' && (
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {[
                { key: 'tous', label: 'Tous' },
                { key: 'en_attente', label: 'En attente' },
                { key: 'recu', label: 'Reçus' },
                { key: 'valide', label: 'Validés' },
                { key: 'televerse_otr', label: 'OTR' },
              ].map(f => (
                <button key={f.key} onClick={() => setFiltreStatut(f.key)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap"
                  style={filtreStatut === f.key
                    ? { background: '#1a3c2e', color: 'white' }
                    : { background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
              </div>
            ) : dossiersFiltres.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400 text-sm">Aucun dossier pour ce filtre</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                        {['Client', 'Type', 'Période', 'Échéance', 'Statut', 'Changer statut', 'Actions'].map(h => (
                          <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dossiersFiltres.map((d, i) => (
                        <tr key={d.id}
                          className="border-b border-gray-50 hover:bg-green-50 transition-colors"
                          style={{
                            background: estEnRetard(d.date_echeance) && d.statut !== 'televerse_otr' ? '#fff8f8'
                              : estUrgent(d.date_echeance) ? '#fffbeb'
                              : i % 2 === 0 ? 'white' : '#fafffe'
                          }}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                                {d.clients?.raison_sociale[0]}
                              </div>
                              <span className="text-sm font-medium text-gray-800">{d.clients?.raison_sociale}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>{d.type_impot}</span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {d.periode_mois ? `${MOIS[d.periode_mois - 1]} ` : ''}{d.periode_annee}
                          </td>
                          <td className="px-5 py-4 text-sm">
                            <span className={estEnRetard(d.date_echeance) && d.statut !== 'televerse_otr' ? 'text-red-600 font-semibold' : estUrgent(d.date_echeance) ? 'text-yellow-600 font-semibold' : 'text-gray-500'}>
                              {new Date(d.date_echeance).toLocaleDateString('fr-FR')}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUT_COULEURS[d.statut]}`}>{STATUT_LABELS[d.statut]}</span>
                          </td>
                          <td className="px-5 py-4">
                            <select value={d.statut} onChange={e => changerStatut(d.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white">
                              <option value="en_attente">En attente</option>
                              <option value="recu">Reçu</option>
                              <option value="valide">Validé</option>
                              <option value="televerse_otr">Téléversé OTR</option>
                            </select>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => { setDossierActif(d); setEmailContenu(''); setRelanceEnvoyee(null); setFichierNom('') }}
                                className="text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                                Gérer
                              </button>
                              <button onClick={() => ouvrirFormulaire(d)}
                                className="text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                                Modifier
                              </button>
                              <button onClick={() => setDossierASupprimer(d)}
                                className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-red-50 text-red-600">
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {dossiersFiltres.map((d) => (
                    <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
                      style={{
                        borderLeftWidth: '3px',
                        borderLeftColor: estEnRetard(d.date_echeance) && d.statut !== 'televerse_otr' ? '#dc2626'
                          : estUrgent(d.date_echeance) ? '#d97706'
                          : '#2d6a4f'
                      }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{d.clients?.raison_sociale}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {d.type_impot} — {d.periode_mois ? MOIS[d.periode_mois - 1] + ' ' : ''}{d.periode_annee}
                          </p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUT_COULEURS[d.statut]}`}>{STATUT_LABELS[d.statut]}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold ${estEnRetard(d.date_echeance) && d.statut !== 'televerse_otr' ? 'text-red-600' : estUrgent(d.date_echeance) ? 'text-yellow-600' : 'text-gray-500'}`}>
                          Échéance : {new Date(d.date_echeance).toLocaleDateString('fr-FR')}
                        </p>
                        <div className="flex gap-1.5">
                          <button onClick={() => { setDossierActif(d); setEmailContenu(''); setRelanceEnvoyee(null); setFichierNom('') }}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                            Gérer
                          </button>
                          <button onClick={() => setDossierASupprimer(d)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600">✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Historique relances */}
        {onglet === 'historique' && (
          <div>
            {relances.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400 text-sm">Aucune relance envoyée</p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                        {['Client', 'Dossier', 'Canal', 'Date envoi', 'Aperçu'].map(h => (
                          <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {relances.map((r, i) => (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-green-50 transition-colors"
                          style={{ background: i % 2 === 0 ? 'white' : '#fafffe' }}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                                {r.clients?.raison_sociale?.[0]}
                              </div>
                              <span className="text-sm font-medium text-gray-800">{r.clients?.raison_sociale}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                              {r.dossiers_fiscaux?.type_impot}{r.dossiers_fiscaux?.periode_mois ? ` — ${MOIS[r.dossiers_fiscaux.periode_mois - 1]}` : ''} {r.dossiers_fiscaux?.periode_annee}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.canal === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {r.canal === 'whatsapp' ? '💬 WhatsApp' : '✉️ Email'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {new Date(r.date_envoi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-400 max-w-xs">
                            <p className="truncate">{r.contenu_email?.substring(0, 60)}...</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  {relances.map(r => (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-800 text-sm">{r.clients?.raison_sociale}</p>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.canal === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {r.canal === 'whatsapp' ? '💬' : '✉️'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{r.dossiers_fiscaux?.type_impot} {r.dossiers_fiscaux?.periode_annee}</p>
                      <p className="text-xs text-gray-400 truncate">{r.contenu_email?.substring(0, 80)}...</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(r.date_envoi).toLocaleDateString('fr-FR')}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
