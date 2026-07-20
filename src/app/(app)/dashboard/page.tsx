'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import Link from 'next/link'

type Dossier = {
  id: string
  type_impot: string
  statut: string
  date_echeance: string
  clients: { raison_sociale: string }
}

export default function DashboardHome() {
  const [user, setUser] = useState<{ prenom: string; nom: string; avatar_url: string | null; role: string } | null>(null)
  const [stats, setStats] = useState({ clients: 0, dossiers: 0, enAttente: 0, alertes: 0 })
  const [dossiersUrgents, setDossiersUrgents] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { charger() }, [])

  async function charger() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return

    const { data: collab } = await supabase.from('collaborateurs').select('prenom, nom, avatar_url, role').eq('id', u.id).single()
    setUser(collab)

    const { data: clients } = await supabase.from('clients').select('id')
    const { data: dossiers } = await supabase.from('dossiers_fiscaux').select('*, clients(raison_sociale)').order('date_echeance', { ascending: true })

    const aujourd = new Date()
    const dans5 = new Date()
    dans5.setDate(dans5.getDate() + 5)

    const urgents = (dossiers || []).filter(d => {
      const ech = new Date(d.date_echeance)
      return ech <= dans5 && d.statut !== 'televerse_otr'
    })

    setStats({
      clients: clients?.length || 0,
      dossiers: dossiers?.length || 0,
      enAttente: (dossiers || []).filter(d => d.statut === 'en_attente').length,
      alertes: urgents.length
    })
    setDossiersUrgents(urgents.slice(0, 5))
    setLoading(false)
  }

  const heure = new Date().getHours()
  const salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'

  const actionsRapides = [
    { label: 'Nouveau client', href: '/dashboard/clients', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>, desc: 'Enregistrer une entreprise', color: '#2d6a4f' },
    { label: 'Nouveau dossier', href: '/dashboard/dossiers', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, desc: 'Ouvrir un dossier fiscal', color: '#3b82f6' },
    { label: 'Assistant IA', href: '/dashboard/assistant', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" /></svg>, desc: 'Interroger les données', color: '#8b5cf6' },
    { label: 'Statistiques', href: '/admin/statistiques', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, desc: 'Tableau de bord', color: '#e8a317' },
  ]

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#f0f4f1' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-2"
        style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div style={{ background: '#f0f4f1', minHeight: '100vh' }}>

      {/* Bannière profil */}
      <div className="relative h-48 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"
          alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(10,31,18,0.80) 0%, rgba(26,60,46,0.65) 60%, rgba(45,106,79,0.4) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, #f0f4f1 100%)' }} />
      </div>

      {/* Profil flottant */}
      <div className="max-w-6xl mx-auto px-8">
        <div className="flex items-end gap-6 -mt-16 mb-8">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative flex-shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar"
                className="w-24 h-24 rounded-2xl object-cover shadow-xl border-4 border-white" />
            ) : (
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-white"
                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white"
              style={{ background: '#2d6a4f' }} />
          </motion.div>

          {/* Infos */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="pb-2">
            <h1 className="text-2xl font-bold text-gray-800">
              {salutation}, {user?.prenom} !
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {user?.role === 'admin' ? 'Administrateur' : 'Collaborateur'} — Experts Afrique Conseils
            </p>
          </motion.div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Clients', value: stats.clients, color: '#2d6a4f', href: '/dashboard/clients' },
            { label: 'Dossiers fiscaux', value: stats.dossiers, color: '#3b82f6', href: '/dashboard/dossiers' },
            { label: 'En attente', value: stats.enAttente, color: '#d97706', href: '/dashboard/dossiers' },
            { label: 'Alertes OTR', value: stats.alertes, color: '#dc2626', href: '/admin/statistiques' },
          ].map((kpi, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}>
              <Link href={kpi.href}
                className="block bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{kpi.label}</p>
                <p className="text-4xl font-bold mt-2" style={{ color: kpi.color }}>{kpi.value}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">

          {/* Actions rapides */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
              <h2 className="font-bold text-white">Actions rapides</h2>
              <p className="text-green-300 text-xs mt-0.5">Accès direct aux fonctionnalités</p>
            </div>
            <div className="p-4 space-y-2">
              {actionsRapides.map((action, i) => (
                <motion.div key={i} whileHover={{ x: 4 }}>
                  <Link href={action.href}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: action.color + '20', color: action.color }}>
                      {action.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{action.label}</p>
                      <p className="text-xs text-gray-400">{action.desc}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Dossiers urgents */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-white">Échéances critiques</h2>
                  <p className="text-green-300 text-xs mt-0.5">Dossiers urgents OTR</p>
                </div>
                {stats.alertes > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {stats.alertes}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4">
              {dossiersUrgents.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#f0f9f4' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#2d6a4f' }} />
                  <p className="text-sm text-gray-500">Aucune échéance critique</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dossiersUrgents.map((d, i) => (
                    <motion.div key={d.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: '#fff8f8' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                          {d.clients?.raison_sociale?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{d.clients?.raison_sociale}</p>
                          <p className="text-xs text-gray-400">{d.type_impot}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-red-600">
                          {new Date(d.date_echeance).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-gray-400">{d.statut}</p>
                      </div>
                    </motion.div>
                  ))}
                  <Link href="/dashboard/dossiers"
                    className="flex items-center justify-center gap-2 mt-3 py-2 rounded-xl text-sm font-medium transition-all"
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
      </div>
    </div>
  )
}