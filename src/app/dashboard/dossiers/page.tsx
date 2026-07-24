'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import { useToast } from '@/components/Toast'
import { motion, AnimatePresence } from 'framer-motion'
import DossierCommentaires from '@/components/DossierCommentaires'
import HistoriqueStatuts from '@/components/HistoriqueStatuts'
import GlobalSearch from '@/components/GlobalSearch'

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
type Document = {
  id: string
  nom_fichier: string
  url_stockage: string
  type_document: string
  created_at: string
}
type AuditLog = {
  id: string
  action: string
  details: string
  created_at: string
  collaborateurs: { nom: string; prenom: string } | null
}
type ModeleRelance = {
  id: string
  type_impot: string
  canal: string
  contenu: string
  nom: string
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
  const { toast } = useToast()
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [relances, setRelances] = useState<Relance[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'dossiers' | 'historique' | 'modeles' | 'audit'>('dossiers')
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
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [canalRelance, setCanalRelance] = useState<'email' | 'whatsapp'>('email')
  // Drag & Drop
  const [dragOver, setDragOver] = useState(false)
  const [fichiersDrop, setFichiersDrop] = useState<File[]>([])
  // Pièces jointes multiples
  const [documentsActif, setDocumentsActif] = useState<Document[]>([])
  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  // Modèles de relance
  const [modeles, setModeles] = useState<ModeleRelance[]>([])
  const [showModeleForm, setShowModeleForm] = useState(false)
  const [modeleNom, setModeleNom] = useState('')
  const [modeleTypeImpot, setModeleTypeImpot] = useState('TVA')
  const [modeleCanal, setModeleCanal] = useState<'email' | 'whatsapp'>('email')
  const [modeleContenu, setModeleContenu] = useState('')
  // Suggestions proactives
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)

  const [showSearch, setShowSearch] = useState(false)
  const [panelOnglet, setPanelOnglet] = useState<'relance' | 'commentaires' | 'historique'>('relance')

  const fileRef = useRef<HTMLInputElement>(null)
  const multiFileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true) }
      if (e.key === 'Escape') setShowSearch(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => { charger() }, [])

  useEffect(() => {
    const channel = supabase
      .channel('dossiers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers_fiscaux' }, () => charger())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function charger() {
    try {
      const [{ data: d }, { data: c }, { data: r }, { data: logs }, { data: mods }] = await Promise.all([
        supabase.from('dossiers_fiscaux').select('*, clients(raison_sociale, email_contact, telephone), collaborateurs(nom, prenom)').order('date_echeance', { ascending: true }),
        supabase.from('clients').select('id, raison_sociale, email_contact, telephone'),
        supabase.from('relances').select('*, clients(raison_sociale), dossiers_fiscaux(type_impot, periode_mois, periode_annee)').order('date_envoi', { ascending: false }),
        supabase.from('audit_logs').select('*, collaborateurs(nom, prenom)').order('created_at', { ascending: false }).limit(100),
        supabase.from('modeles_relance').select('*').order('created_at', { ascending: false }),
      ])
      const dossiersData = d || []
      setDossiers(dossiersData)
      setClients(c || [])
      setRelances(r || [])
      setAuditLogs(logs || [])
      setModeles(mods || [])
      // Mettre à jour dossierActif si panel ouvert
      setDossierActif(prev => prev ? (dossiersData.find((x: Dossier) => x.id === prev.id) || prev) : null)
      // Suggestions proactives
      calculerSuggestions(dossiersData, r || [])
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  function calculerSuggestions(dossiersData: Dossier[], relancesData: Relance[]) {
    const dans7 = new Date(); dans7.setDate(dans7.getDate() + 7)
    const aujourd = new Date()
    const urgents = dossiersData.filter(d => {
      const ech = new Date(d.date_echeance)
      return ech <= dans7 && ech >= aujourd && d.statut === 'en_attente'
    })
    const enRetard = dossiersData.filter(d => new Date(d.date_echeance) < aujourd && d.statut !== 'televerse_otr')
    const s: string[] = []
    if (urgents.length > 0) {
      const types = [...new Set(urgents.map(d => d.type_impot))].join(', ')
      s.push(`${urgents.length} dossier(s) ${types} arrivent à échéance cette semaine — voulez-vous préparer les relances ?`)
    }
    if (enRetard.length > 0) {
      s.push(`${enRetard.length} dossier(s) sont en retard. Action recommandée.`)
    }
    const sansRelance = dossiersData.filter(d =>
      d.statut === 'en_attente' && !relancesData.some(r => (r as any).dossier_id === d.id)
    )
    if (sansRelance.length > 0) {
      s.push(`${sansRelance.length} dossier(s) en attente n'ont reçu aucune relance.`)
    }
    setSuggestions(s)
  }

  async function logAudit(action: string, details: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('audit_logs').insert({ collaborateur_id: user.id, action, details })
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
    if (!clientId || !dateEcheance) { toast('Client et date d\'échéance requis', 'error'); return }
    setSaving(true)
    const payload = {
      client_id: clientId,
      type_impot: typeImpot,
      periode_mois: typeImpot === 'TVA' || typeImpot === 'acompte' ? periodeMois : null,
      periode_annee: periodeAnnee,
      date_echeance: dateEcheance,
    }
    if (dossierEnEdition) {
      const { error } = await supabase.from('dossiers_fiscaux').update(payload).eq('id', dossierEnEdition.id)
      if (error) { toast('Erreur modification : ' + error.message, 'error'); setSaving(false); return }
      await logAudit('MODIFICATION_DOSSIER', `Dossier ${typeImpot} modifié pour le client ${clients.find(c => c.id === clientId)?.raison_sociale}`)
      toast('Dossier modifié avec succès')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('dossiers_fiscaux').insert({ ...payload, statut: 'en_attente', collaborateur_id: user?.id })
      if (error) { toast('Erreur création : ' + error.message, 'error'); setSaving(false); return }
      await logAudit('CREATION_DOSSIER', `Nouveau dossier ${typeImpot} créé pour ${clients.find(c => c.id === clientId)?.raison_sociale}`)
      toast('Dossier créé avec succès')
    }
    setShowForm(false); setDossierEnEdition(null)
    charger(); setSaving(false)
  }

  async function supprimerDossier() {
    if (!dossierASupprimer) return
    setSupprimant(true)
    await logAudit('SUPPRESSION_DOSSIER', `Dossier ${dossierASupprimer.type_impot} de ${dossierASupprimer.clients?.raison_sociale} supprimé`)
    const { error } = await supabase.from('dossiers_fiscaux').delete().eq('id', dossierASupprimer.id)
    if (error) { toast('Erreur suppression : ' + error.message, 'error'); setSupprimant(false); return }
    toast('Dossier supprimé', 'error')
    setDossierASupprimer(null); charger(); setSupprimant(false)
  }

  async function changerStatut(id: string, statut: string, dossier: Dossier) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error: histError } = await supabase.from('historique_statuts').insert({
      dossier_id: id,
      collaborateur_id: user?.id,
      ancien_statut: dossier.statut,
      nouveau_statut: statut,
    })
    if (histError) console.warn('Historique non enregistré:', histError.message)
    const { error } = await supabase.from('dossiers_fiscaux').update({ statut }).eq('id', id)
    if (error) { toast('Erreur changement statut : ' + error.message, 'error'); return }
    await logAudit('CHANGEMENT_STATUT', `Statut de ${dossier.clients?.raison_sociale} (${dossier.type_impot}) : ${STATUT_LABELS[dossier.statut]} → ${STATUT_LABELS[statut]}`)
    toast(`Statut mis à jour : ${STATUT_LABELS[statut]}`)
    charger()
  }

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    if (files.length === 0) {
      toast('Seuls les fichiers PDF sont acceptés', 'error')
      return
    }
    setFichiersDrop(files)
  }, [toast])

  async function uploadFichiers(dossier: Dossier, files: File[]) {
    if (files.length === 0) return
    setUploading(true)
    let success = 0
    for (const file of files) {
      const path = `${dossier.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('documents-fiscaux').upload(path, file, { upsert: true })
      if (error) {
        toast(`Erreur upload ${file.name}: ${error.message}`, 'error')
        continue
      }
      const { error: dbError } = await supabase.from('documents').insert({
        dossier_id: dossier.id,
        nom_fichier: file.name,
        url_stockage: path,
        type_document: file.type
      })
      if (dbError) { toast(`Erreur enregistrement ${file.name}: ${dbError.message}`, 'error'); continue }
      success++
    }
    if (success > 0) {
      await supabase.from('dossiers_fiscaux').update({ statut: 'recu', date_depot: new Date().toISOString() }).eq('id', dossier.id)
      await logAudit('UPLOAD_DOCUMENT', `${success} document(s) uploadé(s) pour ${dossier.clients?.raison_sociale} (${dossier.type_impot})`)
      toast(`${success} fichier(s) uploadé(s) avec succès`)
      await charger()
      await chargerDocuments(dossier.id)
    }
    setFichiersDrop([])
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
  }

  async function chargerDocuments(dossierId: string) {
    const { data, error } = await supabase.from('documents').select('*').eq('dossier_id', dossierId).order('created_at', { ascending: false })
    console.log('[chargerDocuments]', dossierId, data, error)
    setDocumentsActif(data || [])
  }

  async function supprimerDocument(doc: Document, dossierId: string) {
    await supabase.storage.from('documents-fiscaux').remove([doc.url_stockage])
    await supabase.from('documents').delete().eq('id', doc.id)
    await logAudit('SUPPRESSION_DOCUMENT', `Document ${doc.nom_fichier} supprimé`)
    toast('Document supprimé', 'warning')
    chargerDocuments(dossierId)
  }

  async function voirPdf(doc: Document) {
    const { data, error } = await supabase.storage
      .from('documents-fiscaux')
      .createSignedUrl(doc.url_stockage, 300) // 5 minutes
    if (error || !data?.signedUrl) { toast('Impossible d\'ouvrir le fichier', 'error'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function genererContenu(dossier: Dossier, modeleId?: string) {
    setGeneratingEmail(true)
    setRelanceEnvoyee(null)

    // Si modèle sélectionné
    if (modeleId) {
      const modele = modeles.find(m => m.id === modeleId)
      if (modele) {
        const contenu = modele.contenu
          .replace('{client}', dossier.clients.raison_sociale)
          .replace('{type_impot}', dossier.type_impot)
          .replace('{periode}', dossier.periode_mois ? `${MOIS[dossier.periode_mois - 1]} ${dossier.periode_annee}` : String(dossier.periode_annee))
          .replace('{echeance}', new Date(dossier.date_echeance).toLocaleDateString('fr-FR'))
        setEmailContenu(contenu)
        setGeneratingEmail(false)
        return
      }
    }

    const isWA = canalRelance === 'whatsapp'
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Rédige un ${isWA ? 'message WhatsApp' : 'email'} de relance professionnel en français pour demander les documents fiscaux manquants à l'entreprise "${dossier.clients.raison_sociale}". Il s'agit de leur déclaration ${dossier.type_impot}${dossier.periode_mois ? ` du mois ${MOIS[dossier.periode_mois - 1]}` : ''} ${dossier.periode_annee}. L'échéance OTR est le ${new Date(dossier.date_echeance).toLocaleDateString('fr-FR')}. ${isWA ? 'Format court, direct, adapté WhatsApp, sans mise en forme HTML.' : 'Sois professionnel, concis et urgent sans être agressif.'} Ne mets pas de signature.`,
        contexte: '',
        historique: [],
      })
    })
    const data = await res.json()
    setEmailContenu(data.reponse || '')
    setGeneratingEmail(false)
  }

  async function envoyerRelance(dossier: Dossier) {
    if (!emailContenu.trim()) { toast('Rédigez ou générez un message avant d\'envoyer', 'error'); return }
    setSendingRelance(true)
    try {
      if (canalRelance === 'whatsapp') {
        const tel = (dossier.clients.telephone || '').replace(/[^0-9+]/g, '')
        if (!tel) {
          toast('Numéro WhatsApp non renseigné pour ce client — ajoutez-le dans sa fiche', 'error')
          setSendingRelance(false)
          return
        }
        const msg = encodeURIComponent(emailContenu)
        window.open(`https://wa.me/${tel}?text=${msg}`, '_blank')
        const { error } = await supabase.from('relances').insert({
          dossier_id: dossier.id, client_id: dossier.client_id,
          contenu_email: emailContenu, statut: 'envoye_whatsapp', canal: 'whatsapp',
        })
        if (error) { toast('Relance ouverte mais non enregistrée : ' + error.message, 'warning') }
        else {
          await logAudit('RELANCE_WHATSAPP', `Relance WhatsApp envoyée à ${dossier.clients.raison_sociale}`)
          setRelanceEnvoyee('whatsapp')
          toast('Relance WhatsApp envoyée')
        }
      } else {
        const email = dossier.clients.email_contact?.trim()
        if (!email) {
          toast('Email non renseigné pour ce client — ajoutez-le dans sa fiche', 'error')
          setSendingRelance(false)
          return
        }
        const emailjs = (await import('@emailjs/browser')).default
        await emailjs.send(
          process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
          process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
          { to_email: email, from_name: 'Experts Afrique Conseils', message: emailContenu },
          process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
        )
        const { error } = await supabase.from('relances').insert({
          dossier_id: dossier.id, client_id: dossier.client_id,
          contenu_email: emailContenu, statut: 'envoye', canal: 'email',
        })
        if (error) { toast('Email envoyé mais non enregistré : ' + error.message, 'warning') }
        else {
          await logAudit('RELANCE_EMAIL', `Relance email envoyée à ${dossier.clients.raison_sociale}`)
          setRelanceEnvoyee('email')
          toast('Relance email envoyée avec succès')
        }
      }
    } catch (err: any) {
      toast('Erreur envoi : ' + (err?.message || 'Vérifiez vos clés EmailJS'), 'error')
    } finally {
      setSendingRelance(false)
      charger()
    }
  }

  async function sauvegarderModele() {
    if (!modeleNom.trim() || !modeleContenu.trim()) return
    await supabase.from('modeles_relance').insert({
      nom: modeleNom, type_impot: modeleTypeImpot, canal: modeleCanal, contenu: modeleContenu
    })
    toast('Modèle sauvegardé')
    setShowModeleForm(false)
    setModeleNom(''); setModeleContenu('')
    charger()
  }

  async function supprimerModele(id: string) {
    await supabase.from('modeles_relance').delete().eq('id', id)
    toast('Modèle supprimé', 'warning')
    charger()
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
      <AnimatePresence>
        {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
      </AnimatePresence>
      <PageHeader
        titre="Dossiers Fiscaux"
        sousTitre="Suivi des obligations fiscales — OTR Togo"
        imageUrl="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80"
        bouton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden md:inline text-xs opacity-80">Ctrl+K</span>
            </button>
            <motion.button onClick={() => ouvrirFormulaire()}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="px-4 py-2 rounded-xl text-white font-medium shadow-lg text-sm"
              style={{ background: 'linear-gradient(135deg, #e8a317, #d4940f)' }}>
              + Nouveau
            </motion.button>
          </div>
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

        {/* Suggestions proactives */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-5 rounded-2xl border overflow-hidden"
              style={{ background: '#fff8ed', borderColor: '#fcd34d' }}>
              <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: '#fcd34d40' }}>
                <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">Suggestions IA</p>
                <button onClick={() => setShowSuggestions(false)} className="text-yellow-600 text-xs">Fermer</button>
              </div>
              <div className="p-4 space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                      className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 mt-1.5" />
                    <p className="text-sm text-yellow-800">{s}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <button onClick={() => { setDossierActif(null); setEmailContenu(''); setRelanceEnvoyee(null); setFichiersDrop([]); setDocumentsActif([]) }}
                  className="text-gray-400 hover:text-gray-600 text-xl flex-shrink-0">✕</button>
              </div>

              {/* Onglets panel */}
              <div className="flex gap-2 mb-4 border-b border-gray-100 pb-3">
                {[
                  { key: 'relance', label: 'Relance & Documents' },
                  { key: 'commentaires', label: 'Commentaires' },
                  { key: 'historique', label: 'Historique statuts' },
                ].map(o => (
                  <button key={o.key} onClick={() => setPanelOnglet(o.key as any)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={panelOnglet === o.key
                      ? { background: '#2d6a4f', color: 'white' }
                      : { background: '#f3f4f6', color: '#6b7280' }}>
                    {o.label}
                  </button>
                ))}
              </div>

              {panelOnglet === 'commentaires' && (
                <DossierCommentaires dossierId={dossierActif.id} />
              )}

              {panelOnglet === 'historique' && (
                <HistoriqueStatuts dossierId={dossierActif.id} />
              )}

              {panelOnglet === 'relance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload PDF drag & drop + multi-fichiers */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Documents</h3>

                  {/* Zone drag & drop */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => multiFileRef.current?.click()}
                    className="block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
                    style={{
                      borderColor: dragOver ? '#2d6a4f' : fichiersDrop.length > 0 ? '#2d6a4f' : '#d1d5db',
                      background: dragOver ? '#f0f9f4' : fichiersDrop.length > 0 ? '#f0f9f4' : 'white',
                    }}>
                    <input
                      ref={multiFileRef}
                      type="file"
                      accept=".pdf"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf')
                        setFichiersDrop(files)
                      }}
                    />
                    <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                      style={{ background: fichiersDrop.length > 0 ? '#2d6a4f' : '#f3f4f6' }}>
                      <svg className="w-5 h-5" fill="none" stroke={fichiersDrop.length > 0 ? 'white' : '#9ca3af'} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    {fichiersDrop.length > 0 ? (
                      <div>
                        {fichiersDrop.map((f, i) => (
                          <p key={i} className="text-xs font-medium truncate" style={{ color: '#2d6a4f' }}>{f.name}</p>
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">Glissez des PDF ici</p>
                        <p className="text-xs text-gray-400 mt-1">ou cliquez pour sélectionner (multi-fichiers)</p>
                      </>
                    )}
                  </div>

                  <button onClick={() => uploadFichiers(dossierActif, fichiersDrop)} disabled={uploading || fichiersDrop.length === 0}
                    className="mt-3 w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                    {uploading ? 'Upload...' : `Uploader ${fichiersDrop.length > 0 ? `(${fichiersDrop.length} fichier${fichiersDrop.length > 1 ? 's' : ''})` : ''}`}
                  </button>

                  {/* Liste documents existants */}
                  {documentsActif.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pièces jointes</p>
                      {documentsActif.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: '#fee2e2' }}>
                              <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-xs text-gray-700 truncate">{doc.nom_fichier}</p>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                            <button onClick={() => voirPdf(doc)}
                              title="Voir le PDF"
                              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-green-100 transition-colors"
                              style={{ color: '#2d6a4f' }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button onClick={() => supprimerDocument(doc, dossierActif.id)}
                              title="Supprimer"
                              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors text-xs">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Relance IA */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Relance IA ✦</h3>

                  {/* Canal selector */}
                  <div className="flex gap-2 mb-3">
                    {(['email', 'whatsapp'] as const).map(canal => (
                      <button key={canal} onClick={() => { setCanalRelance(canal); setEmailContenu(''); setRelanceEnvoyee(null) }}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border"
                        style={canalRelance === canal
                          ? { background: canal === 'whatsapp' ? '#25D366' : '#2d6a4f', color: 'white', borderColor: 'transparent' }
                          : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                        {canal === 'whatsapp' ? 'WhatsApp' : 'Email'}
                      </button>
                    ))}
                  </div>

                  {/* Sélecteur modèle */}
                  {modeles.filter(m => m.canal === canalRelance).length > 0 && (
                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1.5">Utiliser un modèle</label>
                      <select
                        onChange={e => e.target.value && genererContenu(dossierActif, e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="">Générer avec l'IA</option>
                        {modeles.filter(m => m.canal === canalRelance).map(m => (
                          <option key={m.id} value={m.id}>{m.nom} ({m.type_impot})</option>
                        ))}
                      </select>
                    </div>
                  )}

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
                            Numéro non renseigné — le message sera copié dans le presse-papier
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
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Onglets */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[
            { key: 'dossiers', label: 'Dossiers' },
            { key: 'historique', label: `Relances (${relances.length})` },
            { key: 'modeles', label: `Modèles (${modeles.length})` },
            { key: 'audit', label: `Audit (${auditLogs.length})` },
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

        {/* ===== ONGLET DOSSIERS ===== */}
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
                            <select value={d.statut} onChange={e => changerStatut(d.id, e.target.value, d)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white">
                              <option value="en_attente">En attente</option>
                              <option value="recu">Reçu</option>
                              <option value="valide">Validé</option>
                              <option value="televerse_otr">Téléversé OTR</option>
                            </select>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => { setDossierActif(d); setEmailContenu(''); setRelanceEnvoyee(null); setFichiersDrop([]); chargerDocuments(d.id); setPanelOnglet('relance') }}
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
                          <button onClick={() => { setDossierActif(d); setEmailContenu(''); setRelanceEnvoyee(null); setFichiersDrop([]); chargerDocuments(d.id); setPanelOnglet('relance') }}
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

        {/* ===== ONGLET HISTORIQUE ===== */}
        {onglet === 'historique' && (
          <div>
            {relances.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400 text-sm">Aucune relance envoyée</p>
              </div>
            ) : (
              <>
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
                              {r.canal === 'whatsapp' ? 'WhatsApp' : 'Email'}
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
                <div className="md:hidden space-y-3">
                  {relances.map(r => (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-800 text-sm">{r.clients?.raison_sociale}</p>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.canal === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {r.canal === 'whatsapp' ? 'WA' : 'Email'}
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

        {/* ===== ONGLET MODELES ===== */}
        {onglet === 'modeles' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">Modèles de relance personnalisés par type d'impôt</p>
              <button onClick={() => setShowModeleForm(!showModeleForm)}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #e8a317, #d4940f)' }}>
                + Nouveau modèle
              </button>
            </div>

            <AnimatePresence>
              {showModeleForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4">Créer un modèle</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Variables disponibles : <code className="bg-gray-100 px-1 rounded">{'{client}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{type_impot}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{periode}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{echeance}'}</code>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nom du modèle</label>
                      <input value={modeleNom} onChange={e => setModeleNom(e.target.value)}
                        placeholder="Ex: Relance TVA urgente"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Type d'impôt</label>
                      <select value={modeleTypeImpot} onChange={e => setModeleTypeImpot(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="TVA">TVA</option>
                        <option value="IRPP">IRPP</option>
                        <option value="IS">IS</option>
                        <option value="acompte">Acompte</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Canal</label>
                      <select value={modeleCanal} onChange={e => setModeleCanal(e.target.value as any)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Contenu</label>
                    <textarea value={modeleContenu} onChange={e => setModeleContenu(e.target.value)}
                      placeholder="Madame, Monsieur,&#10;&#10;Nous vous relançons concernant votre déclaration {type_impot} de {periode} pour {client}. L'échéance est le {echeance}."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={sauvegarderModele} disabled={!modeleNom.trim() || !modeleContenu.trim()}
                      className="px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                      Sauvegarder
                    </button>
                    <button onClick={() => setShowModeleForm(false)}
                      className="px-5 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600">
                      Annuler
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {modeles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400 text-sm">Aucun modèle créé</p>
                <p className="text-gray-300 text-xs mt-1">Créez des modèles pour accélérer vos relances</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modeles.map(m => (
                  <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{m.nom}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>{m.type_impot}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.canal === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {m.canal === 'whatsapp' ? 'WhatsApp' : 'Email'}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => supprimerModele(m.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-3 mt-2">{m.contenu}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== ONGLET AUDIT ===== */}
        {onglet === 'audit' && (
          <div>
            {auditLogs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400 text-sm">Aucun log d'audit</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                      {['Date', 'Collaborateur', 'Action', 'Détails'].map(h => (
                        <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-white uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, i) => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-green-50 transition-colors"
                        style={{ background: i % 2 === 0 ? 'white' : '#fafffe' }}>
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3 text-sm">
                          <span className="font-medium text-gray-700">
                            {log.collaborateurs ? `${log.collaborateurs.prenom} ${log.collaborateurs.nom}` : 'Système'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500 max-w-xs">
                          <p className="truncate">{log.details}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
