'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import GlobalSearch from '@/components/GlobalSearch'

type Dossier = {
  id: string
  type_impot: string
  statut: string
  date_echeance: string
  clients: { raison_sociale: string }
}

type Relance = {
  id: string
  contenu_email: string
  date_envoi: string
  canal?: string
  clients: { raison_sociale: string }
  dossiers_fiscaux: { type_impot: string; periode_annee: number }
}

type AuditLog = {
  id: string
  action: string
  details: string
  created_at: string
  collaborateurs: { nom: string; prenom: string } | null
}

export default function DashboardHome() {
  const [user, setUser] = useState<{ prenom: string; nom: string; avatar_url: string | null; role: string } | null>(null)
  const [stats, setStats] = useState({ clients: 0, dossiers: 0, enAttente: 0, alertes: 0 })
  const [dossiersUrgents, setDossiersUrgents] = useState<Dossier[]>([])
  const [dernieresRelances, setDernieresRelances] = useState<Relance[]>([])
  const [activiteRecente, setActiviteRecente] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const supabase = createClient()

  useEffect(() => { charger() }, [])

  // Ctrl+K global
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') setShowSearch(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers_fiscaux' }, () => charger())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => charger())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function charger() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return

    const [{ data: collab }, { data: clients }, { data: dossiers }, { data: relances }, { data: logs }] = await Promise.all([
      supabase.from('collaborateurs').select('prenom, nom, avatar_url, role').eq('id', u.id).single(),
      supabase.from('clients').select('id'),
      supabase.from('dossiers_fiscaux').select('*, clients(raison_sociale)').order('date_echeance', { ascending: true }),
      supabase.from('relances').select('*, clients(raison_sociale), dossiers_fiscaux(type_impot, periode_annee)').order('date_envoi', { ascending: false }).limit(5),
      supabase.from('audit_logs').select('*, collaborateurs(nom, prenom)').order('created_at', { ascending: false }).limit(8),
    ])

    if (collab) setUser(collab)

    const dans5 = new Date(); dans5.setDate(dans5.getDate() + 5)
    const aujourd = new Date()
    const urgents = (dossiers || []).filter((d: any) => {
      const ech = new Date(d.date_echeance)
      return ech <= dans5 && d.statut !== 'televerse_otr'
    })

    setStats({
      clients: clients?.length || 0,
      dossiers: dossiers?.length || 0,
      enAttente: (dossiers || []).filter((d: any) => d.statut === 'en_attente').length,
      alertes: urgents.length,
    })
    setDossiersUrgents(urgents.slice(0, 5))
    setDernieresRelances(relances || [])
    setActiviteRecente(logs || [])
    setLoading(false)
  }

  const heure = new Date().getHours()
  const salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'

  const actionsRapides = [
    { label: 'Nouveau client', href: '/dashboard/clients', desc: 'Enregistrer une entreprise', color: '#2d6a4f', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
    { label: 'Nouveau dossier', href: '/dashboard/dossiers', desc: 'Ouvrir un dossier fiscal', color: '#3b82f6', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { label: 'Assistant IA', href: '/dashboard/assistant', desc: 'Interroger les données', color: '#8b5cf6', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" /></svg> },
    { label: 'Statistiques', href: '/admin/statistiques', desc: 'Tableau de bord', color: '#e8a317', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  ]

  const ACTION_LABELS: Record<string, string> = {
    CREATION_DOSSIER: 'Nouveau dossier',
    MODIFICATION_DOSSIER: 'Dossier modifié',
    SUPPRESSION_DOSSIER: 'Dossier supprimé',
    CHANGEMENT_STATUT: 'Statut changé',
    RELANCE_EMAIL: 'Relance email',
    RELANCE_WHATSAPP: 'Relance WhatsApp',
    UPLOAD_DOCUMENT: 'Document uploadé',
    SUPPRESSION_DOCUMENT: 'Document supprimé',
    COMMENTAIRE: 'Commentaire ajouté',
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#f0f4f1' }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div style={{ background: '#f0f4f1', minHeight: '100vh' }}>
      {/* Bannière */}
      <div className="relative h-40 md:h-48 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"
          alt="" className="w-full h-full object-cover object-center" loading="eager" decoding="async" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,31,18,0.80) 0%, rgba(26,60,46,0.65) 60%, rgba(45,106,79,0.4) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, #f0f4f1 100%)' }} />
        {/* Barre de recherche dans la bannière */}
        <div className="absolute top-4 right-4 md:right-8">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="hidden md:inline">Recherche globale</span>
            <span className="hidden md:inline text-xs opacity-60 ml-1">Ctrl+K</span>
          </button>
        </div>
      </div>

      {/* Modal recherche globale */}
      <AnimatePresence>
        {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
      </AnimatePresence>

      <div className="px-4 md:px-8">
        {/* Profil */}
        <div className="flex items-end gap-4 md:gap-6 -mt-10 md:-mt-12 mb-6 md:mb-8">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative flex-shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-16 h-16 md:w-24 md:h-24 rounded-2xl object-cover shadow-xl border-4 border-white" />
            ) : (
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-xl border-4 border-white"
                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white" style={{ background: '#2d6a4f' }} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="pb-2 pt-10 md:pt-16">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800">{salutation}, {user?.prenom} !</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5">{user?.role === 'admin' ? 'Administrateur' : 'Collaborateur'} — Experts Afrique Conseils</p>
          </motion.div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { label: 'Clients', value: stats.clients, color: '#2d6a4f', href: '/dashboard/clients' },
            { label: 'Dossiers', value: stats.dossiers, color: '#3b82f6', href: '/dashboard/dossiers' },
            { label: 'En attente', value: stats.enAttente, color: '#d97706', href: '/dashboard/dossiers' },
            { label: 'Alertes OTR', value: stats.alertes, color: '#dc2626', href: '/admin/statistiques' },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}>
              <Link href={kpi.href} className="block bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{kpi.label}</p>
                <p className="text-3xl md:text-4xl font-bold mt-1 md:mt-2" style={{ color: kpi.color }}>{kpi.value}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Actions + Urgents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Actions rapides */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
              <h2 className="font-bold text-white text-sm md:text-base">Actions rapides</h2>
              <p className="text-green-300 text-xs mt-0.5">Accès direct aux fonctionnalités</p>
            </div>
            <div className="p-3 md:p-4 space-y-1.5">
              {actionsRapides.map((action, i) => (
                <motion.div key={i} whileHover={{ x: 4 }}>
                  <Link href={action.href} className="flex items-center gap-3 md:gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: action.color + '20', color: action.color }}>
                      {action.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{action.label}</p>
                      <p className="text-xs text-gray-400 hidden md:block">{action.desc}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Dossiers urgents du jour */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-white text-sm md:text-base">Dossiers urgents</h2>
                  <p className="text-green-300 text-xs mt-0.5">Échéances dans les 5 prochains jours</p>
                </div>
                {stats.alertes > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">{stats.alertes}</span>
                )}
              </div>
            </div>
            <div className="p-3 md:p-4">
              {dossiersUrgents.length === 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f0f9f4' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#2d6a4f' }} />
                  <p className="text-sm text-gray-500">Aucune échéance critique</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dossiersUrgents.map((d, i) => {
                    const ech = new Date(d.date_echeance)
                    const diff = Math.ceil((ech.getTime() - Date.now()) / 86400000)
                    return (
                      <motion.div key={d.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-xl" style={{ background: diff <= 0 ? '#fff8f8' : '#fffbeb' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: diff <= 0 ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #d97706, #b45309)' }}>
                            {d.clients?.raison_sociale?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{d.clients?.raison_sociale}</p>
                            <p className="text-xs text-gray-400">{d.type_impot}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className={`text-xs font-semibold ${diff <= 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                            {diff <= 0 ? 'En retard' : `J-${diff}`}
                          </p>
                          <p className="text-xs text-gray-400">{ech.toLocaleDateString('fr-FR')}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                  <Link href="/dashboard/dossiers"
                    className="flex items-center justify-center gap-2 mt-2 py-2 rounded-xl text-sm font-medium"
                    style={{ color: '#2d6a4f', background: '#f0f9f4' }}>
                    Voir tous les dossiers
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Dernières relances + Activité récente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* Dernières relances */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800 text-sm">Dernières relances</h2>
                <p className="text-gray-400 text-xs mt-0.5">Historique récent</p>
              </div>
              <Link href="/dashboard/dossiers" className="text-xs font-medium" style={{ color: '#2d6a4f' }}>Voir tout</Link>
            </div>
            <div className="p-3 md:p-4">
              {dernieresRelances.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucune relance envoyée</p>
              ) : (
                <div className="space-y-2">
                  {dernieresRelances.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8fafc' }}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                        style={{ background: r.canal === 'whatsapp' ? '#25D366' : '#3b82f6' }}>
                        {r.canal === 'whatsapp' ? 'W' : '@'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{r.clients?.raison_sociale}</p>
                        <p className="text-xs text-gray-400 truncate">{r.dossiers_fiscaux?.type_impot} {r.dossiers_fiscaux?.periode_annee}</p>
                      </div>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(r.date_envoi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Activité récente */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800 text-sm">Activité récente</h2>
                <p className="text-gray-400 text-xs mt-0.5">Actions de l'équipe</p>
              </div>
            </div>
            <div className="p-3 md:p-4">
              {activiteRecente.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucune activité</p>
              ) : (
                <div className="space-y-2">
                  {activiteRecente.map((log, i) => (
                    <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                        {log.collaborateurs ? `${log.collaborateurs.prenom[0]}${log.collaborateurs.nom[0]}` : 'S'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-700">
                          {log.collaborateurs ? `${log.collaborateurs.prenom} ${log.collaborateurs.nom}` : 'Système'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{log.details}</p>
                      </div>
                      <p className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
