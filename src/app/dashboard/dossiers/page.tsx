'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import PageHeader from '@/components/PageHeader'
import { useToast } from '@/components/Toast'
import GlobalSearch from '@/components/GlobalSearch'
import DossierForm from '@/components/DossierForm'
import DossierPanel from '@/components/DossierPanel'
import AuditTab from '@/components/AuditTab'
import { STATUT_LABELS, ACOMPTES, getAcompteEcheance, formatPeriode } from '@/lib/types'

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const STATUT_COULEURS: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  recu: 'bg-blue-100 text-blue-800',
  valide: 'bg-green-100 text-green-700',
  televerse_otr: 'bg-purple-100 text-purple-800',
}

type Dossier = {
  id: string; client_id: string; type_impot: string; periode_mois: number | null
  periode_annee: number; statut: string; date_echeance: string; date_depot: string | null
  collaborateur_id: string; montant: number | null
  clients: { raison_sociale: string; email_contact: string; telephone?: string }
  collaborateurs: { nom: string; prenom: string } | null
}

type Client = { id: string; raison_sociale: string }

export default function DossiersPage() {
  const supabase = createClient()
  const { toast } = useToast()

  // Données
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [relances, setRelances] = useState<any[]>([])
  const [modeles, setModeles] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // UI
  const [onglet, setOnglet] = useState<'dossiers' | 'relances' | 'modeles' | 'audit'>('dossiers')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [showForm, setShowForm] = useState(false)
  const [dossierActif, setDossierActif] = useState<Dossier | null>(null)
  const [dossierEnEdition, setDossierEnEdition] = useState<Dossier | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)

  // Formulaire
  const [clientId, setClientId] = useState('')
  const [typeImpot, setTypeImpot] = useState('TVA')
  const [periodeMois, setPeriodeMois] = useState(1)
  const [periodeAnnee, setPeriodeAnnee] = useState(new Date().getFullYear())
  const [dateEcheance, setDateEcheance] = useState('')
  const [numeroAcompte, setNumeroAcompte] = useState(1)
  const [montant, setMontant] = useState(0)
  const [saving, setSaving] = useState(false)

  // Relance
  const [canalRelance, setCanalRelance] = useState('email')
  const [messageRelance, setMessageRelance] = useState('')
  const [sendingRelance, setSendingRelance] = useState(false)
  const [generatingRelance, setGeneratingRelance] = useState(false)

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const [{ data: d }, { data: c }, { data: r }, { data: m }, { data: a }] = await Promise.all([
      supabase.from('dossiers_fiscaux').select('*, clients(raison_sociale, email_contact, telephone), collaborateurs(nom, prenom)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, raison_sociale').order('raison_sociale'),
      supabase.from('relances').select('*, clients(raison_sociale), dossiers_fiscaux(type_impot, periode_annee)').order('date_envoi', { ascending: false }),
      supabase.from('modeles_relance').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_logs').select('*, collaborateurs(nom, prenom)').order('created_at', { ascending: false }).limit(50),
    ])
    setDossiers(d || [])
    setClients(c || [])
    setRelances(r || [])
    setModeles(m || [])
    setAuditLogs(a || [])

    // Suggestions IA proactives
    const sugg: string[] = []
    const aujourd = new Date()
    const retards = (d || []).filter((x: Dossier) => new Date(x.date_echeance) < aujourd && x.statut !== 'televerse_otr')
    const sansRelance = (d || []).filter((x: Dossier) => x.statut === 'en_attente' && !(r || []).some((rel: any) => rel.dossier_id === x.id))
    if (retards.length > 0) sugg.push(`${retards.length} dossier(s) sont en retard. Action recommandée.`)
    if (sansRelance.length > 0) sugg.push(`${sansRelance.length} dossier(s) en attente n'ont reçu aucune relance.`)
    setSuggestions(sugg)
    setLoading(false)
  }

  function resetForm() {
    setClientId(''); setTypeImpot('TVA'); setPeriodeMois(1)
    setPeriodeAnnee(new Date().getFullYear()); setDateEcheance('')
    setNumeroAcompte(1); setMontant(0)
    setDossierEnEdition(null); setShowForm(false)
  }

  function ouvrirEdition(d: Dossier) {
    setDossierEnEdition(d); setClientId(d.client_id); setTypeImpot(d.type_impot)
    setPeriodeMois(d.periode_mois || 1); setPeriodeAnnee(d.periode_annee)
    setDateEcheance(d.date_echeance || ''); setNumeroAcompte(d.periode_mois || 1)
    setMontant(d.montant || 0)
    setShowForm(true); setDossierActif(null)
  }

  async function sauvegarder() {
    if (!clientId) { toast('Veuillez sélectionner un client', 'error'); return }
    if (typeImpot !== 'acompte' && !dateEcheance) { toast('La date d\'échéance est requise', 'error'); return }
    setSaving(true)
    const payload = {
      client_id: clientId, type_impot: typeImpot,
      periode_mois: typeImpot === 'TVA' ? periodeMois : typeImpot === 'acompte' ? numeroAcompte : null,
      periode_annee: periodeAnnee,
      date_echeance: typeImpot === 'acompte' ? getAcompteEcheance(numeroAcompte, periodeAnnee) : dateEcheance,
      montant: montant || null,
    }
    if (dossierEnEdition) {
      const { error } = await supabase.from('dossiers_fiscaux').update(payload).eq('id', dossierEnEdition.id)
      if (error) { toast('Erreur modification', 'error'); setSaving(false); return }
      await supabase.from('audit_logs').insert({ action: 'MODIFICATION_DOSSIER', details: `Dossier ${typeImpot} modifié` })
      toast('Dossier modifié', 'success')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('dossiers_fiscaux').insert({ ...payload, collaborateur_id: user?.id, statut: 'en_attente' })
      if (error) { toast('Erreur création', 'error'); setSaving(false); return }
      await supabase.from('audit_logs').insert({ action: 'CREATION_DOSSIER', details: `Dossier ${typeImpot} créé` })
      toast('Dossier créé', 'success')
    }
    setSaving(false); resetForm(); charger()
  }

  async function changerStatut(id: string, statut: string) {
    const ancien = dossiers.find(d => d.id === id)?.statut
    const { error } = await supabase.from('dossiers_fiscaux').update({ statut, date_depot: statut === 'recu' ? new Date().toISOString() : undefined }).eq('id', id)
    if (error) { toast('Erreur', 'error'); return }
    await supabase.from('historique_statuts').insert({ dossier_id: id, ancien_statut: ancien, nouveau_statut: statut })
    await supabase.from('audit_logs').insert({ action: 'CHANGEMENT_STATUT', details: `${ancien} → ${statut}` })
    charger()
    if (dossierActif?.id === id) setDossierActif(prev => prev ? { ...prev, statut } : null)
  }

  async function supprimerDossier(id: string) {
    if (!confirm('Supprimer ce dossier ?')) return
    await supabase.from('dossiers_fiscaux').delete().eq('id', id)
    await supabase.from('audit_logs').insert({ action: 'SUPPRESSION_DOSSIER', details: `Dossier supprimé` })
    toast('Dossier supprimé', 'success')
    if (dossierActif?.id === id) setDossierActif(null)
    charger()
  }

  async function genererRelance() {
    if (!dossierActif) return
    setGeneratingRelance(true)
    const contexteFacturation = dossierActif.montant
      ? ` Le montant de l'impôt pour ce dossier est de ${Number(dossierActif.montant).toLocaleString('fr-FR')} FCFA.`
      : ''
    const isWA = canalRelance === 'whatsapp'
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Rédige un ${isWA ? 'message WhatsApp' : 'email'} de relance professionnel en français pour demander les documents fiscaux manquants à l'entreprise "${dossierActif.clients.raison_sociale}". Il s'agit de leur déclaration ${dossierActif.type_impot}${dossierActif.periode_mois ? ` du mois ${MOIS[dossierActif.periode_mois - 1]}` : ''} ${dossierActif.periode_annee}. L'échéance OTR est le ${new Date(dossierActif.date_echeance).toLocaleDateString('fr-FR')}.${contexteFacturation} ${isWA ? 'Format court, direct, WhatsApp, sans HTML.' : 'Sois professionnel, concis et urgent.'} Ne mets pas de signature.`,
          contexte: '', historique: [],
        })
      })
      const data = await res.json()
      setMessageRelance(data.message || data.response || '')
    } catch { toast('Erreur génération IA', 'error') }
    setGeneratingRelance(false)
  }

  async function envoyerRelance() {
    if (!dossierActif || !messageRelance) return
    setSendingRelance(true)
    try {
      if (canalRelance === 'email') {
        const emailjs = (await import('@emailjs/browser')).default
        await emailjs.send(
          process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
          process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
          { to_email: dossierActif.clients.email_contact, from_name: 'Experts Afrique Conseils', message: messageRelance },
          process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
        )
      } else {
        const tel = dossierActif.clients.telephone?.replace(/\D/g, '')
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(messageRelance)}`, '_blank')
      }
      await supabase.from('relances').insert({
        dossier_id: dossierActif.id, client_id: dossierActif.client_id,
        contenu_email: messageRelance, canal: canalRelance, statut: 'envoye'
      })
      await supabase.from('audit_logs').insert({ action: `RELANCE_${canalRelance.toUpperCase()}`, details: `Relance envoyée à ${dossierActif.clients.raison_sociale}` })
      toast('Relance envoyée', 'success')
      setMessageRelance('')
      charger()
    } catch (e: unknown) {
      toast('Erreur envoi : ' + (e instanceof Error ? e.message : 'Vérifiez vos clés EmailJS'), 'error')
    }
    setSendingRelance(false)
  }

  const dossiersFiltres = dossiers.filter(d => filtreStatut === 'tous' || d.statut === filtreStatut)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f4f1' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 rounded-full border-2" style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
    </div>
  )

  const stats = {
    total: dossiers.length,
    enAttente: dossiers.filter(d => d.statut === 'en_attente').length,
    recu: dossiers.filter(d => d.statut === 'recu').length,
    valide: dossiers.filter(d => d.statut === 'valide').length,
  }

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f1' }}>
      <PageHeader titre="Dossiers Fiscaux" sousTitre="Suivi des obligations fiscales — OTR Togo"
        imageUrl="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80"
        bouton={
          <button onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: 'rgba(232,163,23,0.9)', backdropFilter: 'blur(4px)' }}>
            + Nouveau
          </button>
        } />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total', value: stats.total, color: '#1a3c2e' },
            { label: 'En attente', value: stats.enAttente, color: '#d97706' },
            { label: 'Reçus', value: stats.recu, color: '#2563eb' },
            { label: 'Validés', value: stats.valide, color: '#2d6a4f' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Suggestions IA */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Suggestions IA</p>
                  {suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {s}
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowSuggestions(false)} className="text-amber-400 hover:text-amber-600 text-sm ml-4">Fermer</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire */}
        <AnimatePresence>
          {showForm && (
            <DossierForm
              clients={clients} dossierEnEdition={!!dossierEnEdition}
              clientId={clientId} setClientId={setClientId}
              typeImpot={typeImpot} setTypeImpot={setTypeImpot}
              periodeMois={periodeMois} setPeriodeMois={setPeriodeMois}
              periodeAnnee={periodeAnnee} setPeriodeAnnee={setPeriodeAnnee}
              dateEcheance={dateEcheance} setDateEcheance={setDateEcheance}
              numeroAcompte={numeroAcompte} setNumeroAcompte={setNumeroAcompte}
              montant={montant} setMontant={setMontant}
              saving={saving} onSave={sauvegarder} onClose={resetForm}
            />
          )}
        </AnimatePresence>

        {/* Onglets principaux */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {(['dossiers', 'relances', 'modeles', 'audit'] as const).map(o => (
            <button key={o} onClick={() => setOnglet(o)}
              className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
              style={onglet === o
                ? { background: '#1a3c2e', color: '#fff' }
                : { background: '#fff', color: '#2d6a4f', border: '1px solid #d1fae5' }}>
              {o === 'dossiers' && `Dossiers`}
              {o === 'relances' && `Relances (${relances.length})`}
              {o === 'modeles' && `Modèles (${modeles.length})`}
              {o === 'audit' && `Audit (${auditLogs.length})`}
            </button>
          ))}
        </div>

        {/* Onglet Dossiers */}
        {onglet === 'dossiers' && (
          <div className={`grid grid-cols-1 gap-5 ${dossierActif ? 'lg:grid-cols-2' : ''}`}>
            {/* Liste */}
            <div>
              {/* Filtres */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {[
                  { key: 'tous', label: 'Tous' },
                  { key: 'en_attente', label: 'En attente' },
                  { key: 'recu', label: 'Reçus' },
                  { key: 'valide', label: 'Validés' },
                  { key: 'televerse_otr', label: 'OTR' },
                ].map(f => (
                  <button key={f.key} onClick={() => setFiltreStatut(f.key)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
                    style={filtreStatut === f.key
                      ? { background: '#1a3c2e', color: '#fff' }
                      : { background: '#fff', color: '#4a7c5e', border: '1px solid #d1fae5' }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Table desktop */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                      {['Client', 'Type', 'Période', 'Échéance', 'Statut', 'Montant (FCFA)', 'Changer statut', 'Actions'].map(h => (
                        <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dossiersFiltres.map((d, i) => {
                      const enRetard = new Date(d.date_echeance) < new Date() && d.statut !== 'televerse_otr'
                      return (
                        <tr key={d.id} className="border-b border-gray-50 hover:bg-green-50 transition-colors cursor-pointer"
                          style={{ background: dossierActif?.id === d.id ? '#f0f7f3' : i % 2 === 0 ? 'white' : '#fafffe' }}
                          onClick={() => setDossierActif(dossierActif?.id === d.id ? null : d)}>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: '#2d6a4f' }}>
                                {d.clients?.raison_sociale?.[0]?.toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-800 truncate max-w-[100px]">{d.clients?.raison_sociale}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: '#f0f4f1', color: '#2d6a4f' }}>{d.type_impot}</span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{formatPeriode(d.type_impot, d.periode_mois, d.periode_annee)}</td>
                          <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: enRetard ? '#dc2626' : '#374151', fontWeight: enRetard ? 600 : 400 }}>
                            {d.date_echeance ? new Date(d.date_echeance).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUT_COULEURS[d.statut]}`}>
                              {STATUT_LABELS[d.statut as keyof typeof STATUT_LABELS]}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm font-medium whitespace-nowrap" style={{ color: '#1a3c2e' }}>
                            {d.montant ? `${Number(d.montant).toLocaleString('fr-FR')} FCFA` : '—'}
                          </td>
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <select value={d.statut} onChange={e => changerStatut(d.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none">
                              <option value="en_attente">En attente</option>
                              <option value="recu">Reçu</option>
                              <option value="valide">Validé</option>
                              <option value="televerse_otr">Téléversé OTR</option>
                            </select>
                          </td>
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setDossierActif(d)} className="text-xs text-green-600 hover:underline">Gérer</button>
                              <button onClick={() => ouvrirEdition(d)} className="text-xs text-blue-500 hover:underline">Modifier</button>
                              <button onClick={() => supprimerDossier(d.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
                {dossiersFiltres.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">Aucun dossier</div>
                )}
              </div>

              {/* Cards mobile */}
              <div className="md:hidden space-y-3">
                {dossiersFiltres.map(d => {
                  const enRetard = new Date(d.date_echeance) < new Date() && d.statut !== 'televerse_otr'
                  return (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                      style={{ borderLeft: dossierActif?.id === d.id ? '3px solid #2d6a4f' : undefined }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{d.clients?.raison_sociale}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{d.type_impot} — {formatPeriode(d.type_impot, d.periode_mois, d.periode_annee)}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUT_COULEURS[d.statut]}`}>
                          {STATUT_LABELS[d.statut as keyof typeof STATUT_LABELS]}
                        </span>
                      </div>
                      {d.date_echeance && (
                        <p className="text-xs mb-3" style={{ color: enRetard ? '#dc2626' : '#6b7280' }}>
                          Échéance : {new Date(d.date_echeance).toLocaleDateString('fr-FR')}
                          {enRetard && ' ⚠ En retard'}
                        </p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <select value={d.statut} onChange={e => changerStatut(d.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 flex-1 focus:outline-none">
                          <option value="en_attente">En attente</option>
                          <option value="recu">Reçu</option>
                          <option value="valide">Validé</option>
                          <option value="televerse_otr">Téléversé OTR</option>
                        </select>
                        <button onClick={() => setDossierActif(d)} className="text-xs px-3 py-1 rounded-lg text-white" style={{ background: '#2d6a4f' }}>Gérer</button>
                        <button onClick={() => ouvrirEdition(d)} className="text-xs px-3 py-1 rounded-lg border border-blue-200 text-blue-500">Modifier</button>
                        <button onClick={() => supprimerDossier(d.id)} className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-400">Suppr.</button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Panel dossier actif */}
            <AnimatePresence>
              {dossierActif && (
                <DossierPanel
                  dossier={dossierActif}
                  auditLogs={auditLogs}
                  relancesOnglet={relances.filter(r => r.dossier_id === dossierActif.id)}
                  modeles={modeles}
                  canalRelance={canalRelance} setCanalRelance={setCanalRelance}
                  messageRelance={messageRelance} setMessageRelance={setMessageRelance}
                  sendingRelance={sendingRelance}
                  onClose={() => setDossierActif(null)}
                  onUpdate={charger}
                  onSendRelance={envoyerRelance}
                  onGenererRelance={genererRelance}
                  generatingRelance={generatingRelance}
                  onStatutChange={changerStatut}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Onglet Relances */}
        {onglet === 'relances' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                    {['Date', 'Client', 'Canal', 'Aperçu message'].map(h => (
                      <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relances.map((r, i) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-green-50"
                      style={{ background: i % 2 === 0 ? 'white' : '#fafffe' }}>
                      <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(r.date_envoi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-700">{r.clients?.raison_sociale}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${r.canal === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {r.canal === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 max-w-xs">
                        <p className="truncate">{r.contenu_email}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {relances.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Aucune relance</div>}
            </div>
          </div>
        )}

        {/* Onglet Modèles */}
        {onglet === 'modeles' && (
          <div className="space-y-3">
            {modeles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">Aucun modèle de relance</div>
            ) : modeles.map(m => (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="font-semibold text-gray-800 text-sm mb-1">{m.nom}</p>
                <p className="text-xs text-gray-500 truncate">{m.contenu}</p>
              </div>
            ))}
          </div>
        )}

        {/* Onglet Audit */}
        {onglet === 'audit' && <AuditTab logs={auditLogs} />}
      </div>
    </div>
  )
}
