'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import { motion, AnimatePresence } from 'framer-motion'

type Dossier = {
  id: string
  type_impot: string
  statut: string
  date_echeance: string
  periode_mois: number | null
  periode_annee: number
  clients: { raison_sociale: string }
}

const STATUT_COULEURS: Record<string, { bg: string; text: string; dot: string }> = {
  en_attente: { bg: '#fef9c3', text: '#854d0e', dot: '#d97706' },
  recu: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  valide: { bg: '#dcfce7', text: '#166534', dot: '#2d6a4f' },
  televerse_otr: { bg: '#f3e8ff', text: '#6b21a8', dot: '#9333ea' },
}
const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  recu: 'Reçu',
  valide: 'Validé',
  televerse_otr: 'Téléversé OTR',
}
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export default function CalendrierPage() {
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [moisActif, setMoisActif] = useState(new Date().getMonth())
  const [anneeActif, setAnneeActif] = useState(new Date().getFullYear())
  const [jourSelectionne, setJourSelectionne] = useState<number | null>(null)
  const [filtreType, setFiltreType] = useState('tous')
  const supabase = createClient()

  useEffect(() => { charger() }, [])

  async function charger() {
    const { data } = await supabase
      .from('dossiers_fiscaux')
      .select('id, type_impot, statut, date_echeance, periode_mois, periode_annee, clients(raison_sociale)')
      .order('date_echeance', { ascending: true })
    setDossiers(data || [])
    setLoading(false)
  }

  function moisPrecedent() {
    if (moisActif === 0) { setMoisActif(11); setAnneeActif(a => a - 1) }
    else setMoisActif(m => m - 1)
    setJourSelectionne(null)
  }

  function moisSuivant() {
    if (moisActif === 11) { setMoisActif(0); setAnneeActif(a => a + 1) }
    else setMoisActif(m => m + 1)
    setJourSelectionne(null)
  }

  // Générer les jours du mois
  const premierJour = new Date(anneeActif, moisActif, 1)
  const dernierJour = new Date(anneeActif, moisActif + 1, 0)
  const decalage = (premierJour.getDay() + 6) % 7 // lundi = 0
  const nbJours = dernierJour.getDate()

  // Dossiers du mois filtré
  const dossiersFiltered = dossiers.filter(d => {
    const date = new Date(d.date_echeance)
    const typeOk = filtreType === 'tous' || d.type_impot === filtreType
    return date.getMonth() === moisActif && date.getFullYear() === anneeActif && typeOk
  })

  function dossiersJour(jour: number) {
    return dossiersFiltered.filter(d => {
      const date = new Date(d.date_echeance)
      return date.getDate() === jour
    })
  }

  const aujourd = new Date()
  const estAujourdhui = (jour: number) =>
    jour === aujourd.getDate() && moisActif === aujourd.getMonth() && anneeActif === aujourd.getFullYear()

  const dossiersJourSelectionne = jourSelectionne ? dossiersJour(jourSelectionne) : []

  // Stats du mois
  const statsM = {
    total: dossiersFiltered.length,
    en_attente: dossiersFiltered.filter(d => d.statut === 'en_attente').length,
    traites: dossiersFiltered.filter(d => d.statut === 'valide' || d.statut === 'televerse_otr').length,
  }

  return (
    <div style={{ background: '#f0f4f1', minHeight: '100vh' }}>
      <PageHeader
        titre="Calendrier Fiscal"
        sousTitre="Vue mensuelle des échéances OTR"
        imageUrl="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1200&q=80"
      />

      <div className="px-4 md:px-8 py-6 md:py-8">
        {/* Stats mois */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Échéances ce mois', value: statsM.total, color: '#1a3c2e' },
            { label: 'En attente', value: statsM.en_attente, color: '#d97706' },
            { label: 'Traités', value: statsM.traites, color: '#2d6a4f' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-medium">{s.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendrier */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Navigation */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
              <button onClick={moisPrecedent} className="text-white/70 hover:text-white p-1 rounded-lg transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <h2 className="text-white font-bold text-lg">{MOIS_NOMS[moisActif]} {anneeActif}</h2>
              </div>
              <button onClick={moisSuivant} className="text-white/70 hover:text-white p-1 rounded-lg transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Filtres */}
            <div className="flex gap-2 px-4 py-3 border-b border-gray-100 overflow-x-auto">
              {['tous', 'TVA', 'IRPP', 'IS', 'acompte'].map(t => (
                <button key={t} onClick={() => setFiltreType(t)}
                  className="px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                  style={filtreType === t
                    ? { background: '#1a3c2e', color: 'white' }
                    : { background: '#f0f4f1', color: '#6b7280' }}>
                  {t === 'tous' ? 'Tous' : t}
                </button>
              ))}
            </div>

            {/* Jours semaine */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {JOURS.map(j => (
                <div key={j} className="px-2 py-2 text-center text-xs font-semibold text-gray-400 uppercase">
                  {j}
                </div>
              ))}
            </div>

            {/* Grille jours */}
            <div className="grid grid-cols-7">
              {/* Cases vides avant le 1er */}
              {Array.from({ length: decalage }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[70px] border-b border-r border-gray-100" />
              ))}

              {/* Jours du mois */}
              {Array.from({ length: nbJours }).map((_, i) => {
                const jour = i + 1
                const dossiersJ = dossiersJour(jour)
                const selectionne = jourSelectionne === jour
                const auJourd = estAujourdhui(jour)

                return (
                  <motion.div
                    key={jour}
                    onClick={() => setJourSelectionne(selectionne ? null : jour)}
                    whileHover={{ background: '#f0f9f4' }}
                    className="min-h-[70px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors"
                    style={{ background: selectionne ? '#f0f9f4' : 'white' }}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${auJourd ? 'text-white' : 'text-gray-700'}`}
                      style={{ background: auJourd ? '#2d6a4f' : 'transparent' }}>
                      {jour}
                    </div>
                    <div className="space-y-0.5">
                      {dossiersJ.slice(0, 3).map((d, di) => {
                        const couleur = STATUT_COULEURS[d.statut]
                        return (
                          <div key={di} className="text-xs px-1.5 py-0.5 rounded-md truncate font-medium"
                            style={{ background: couleur.bg, color: couleur.text }}>
                            {d.type_impot}
                          </div>
                        )
                      })}
                      {dossiersJ.length > 3 && (
                        <div className="text-xs text-gray-400 pl-1.5">+{dossiersJ.length - 3}</div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Panel latéral */}
          <div className="space-y-4">
            {/* Légende */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Légende</h3>
              <div className="space-y-2">
                {Object.entries(STATUT_COULEURS).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: val.dot }} />
                    <span className="text-xs text-gray-600">{STATUT_LABELS[key]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Détail jour sélectionné */}
            <AnimatePresence>
              {jourSelectionne && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100"
                    style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                    <h3 className="text-white font-semibold text-sm">
                      {jourSelectionne} {MOIS_NOMS[moisActif]} {anneeActif}
                    </h3>
                    <p className="text-green-300 text-xs mt-0.5">{dossiersJourSelectionne.length} échéance(s)</p>
                  </div>
                  <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                    {dossiersJourSelectionne.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Aucune échéance ce jour</p>
                    ) : dossiersJourSelectionne.map(d => {
                      const couleur = STATUT_COULEURS[d.statut]
                      return (
                        <div key={d.id} className="p-3 rounded-xl border border-gray-100">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{d.clients?.raison_sociale}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{d.type_impot}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                              style={{ background: couleur.bg, color: couleur.text }}>
                              {STATUT_LABELS[d.statut]}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prochaines échéances */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100"
                style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
                <h3 className="text-white font-semibold text-sm">Prochaines échéances</h3>
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                {dossiers
                  .filter(d => new Date(d.date_echeance) >= aujourd && d.statut !== 'televerse_otr')
                  .slice(0, 8)
                  .map(d => {
                    const ech = new Date(d.date_echeance)
                    const diff = Math.ceil((ech.getTime() - aujourd.getTime()) / (1000 * 60 * 60 * 24))
                    return (
                      <div key={d.id} className="flex items-center justify-between p-2.5 rounded-xl"
                        style={{ background: diff <= 3 ? '#fff8f8' : diff <= 7 ? '#fffbeb' : '#f8fafb' }}>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{d.clients?.raison_sociale}</p>
                          <p className="text-xs text-gray-500">{d.type_impot}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-xs font-bold" style={{ color: diff <= 3 ? '#dc2626' : diff <= 7 ? '#d97706' : '#2d6a4f' }}>
                            J-{diff}
                          </p>
                          <p className="text-xs text-gray-400">{ech.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
