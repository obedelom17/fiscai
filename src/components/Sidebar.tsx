'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { useRole } from '@/lib/useRole'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { isAdmin, loading } = useRole()
  const [user, setUser] = useState<{ prenom: string; nom: string; email: string; avatar_url: string | null } | null>(null)

  useEffect(() => {
    async function charger() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const { data } = await supabase.from('collaborateurs').select('prenom, nom, email, avatar_url').eq('id', u.id).single()
      setUser(data)
    }
    charger()
  }, [])

  async function deconnexion() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const liensCollaborateur = [
    {
      href: '/dashboard/clients', label: 'Clients',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    },
    {
      href: '/dashboard/dossiers', label: 'Dossiers',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    {
      href: '/dashboard/assistant', label: 'Assistant IA',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" /></svg>
    },
  ]

  const liensAdmin = [
    {
      href: '/admin/portefeuilles', label: 'Portefeuilles',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },
    {
      href: '/admin/statistiques', label: 'Statistiques',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    },
  ]

  const liens = isAdmin ? [...liensCollaborateur, ...liensAdmin] : liensCollaborateur

  return (
    <aside className="w-56 min-h-screen flex flex-col sticky top-0"
      style={{ background: 'linear-gradient(180deg, #0f2318 0%, #1a3c2e 100%)' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #e8a317, #f5c842)' }}>
            <span className="text-white text-lg font-black">F</span>
          </motion.div>
          <div>
            <p className="text-white font-bold text-base leading-none">FiscAl</p>
            <p className="text-green-400 text-xs mt-0.5">Experts Afrique Conseils</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {!loading && liens.map((lien, i) => {
          const actif = pathname === lien.href
          return (
            <motion.div key={lien.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ x: 3 }}>
              <Link href={lien.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={actif
                  ? { background: 'rgba(232,163,23,0.15)', color: '#e8a317', borderLeft: '3px solid #e8a317' }
                  : { color: 'rgba(255,255,255,0.65)', borderLeft: '3px solid transparent' }}>
                <span style={{ color: actif ? '#e8a317' : 'rgba(255,255,255,0.5)' }}>{lien.icon}</span>
                {lien.label}
              </Link>
            </motion.div>
          )
        })}

        {/* Séparateur */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="text-xs text-white/30 uppercase tracking-wider px-3 mb-2">Compte</p>
          <motion.div whileHover={{ x: 3 }}>
            <Link href="/parametres"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={pathname === '/parametres'
                ? { background: 'rgba(232,163,23,0.15)', color: '#e8a317', borderLeft: '3px solid #e8a317' }
                : { color: 'rgba(255,255,255,0.65)', borderLeft: '3px solid transparent' }}>
              <svg className="w-5 h-5" style={{ color: pathname === '/parametres' ? '#e8a317' : 'rgba(255,255,255,0.5)' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Paramètres
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Profil + Déconnexion */}
      <div className="px-3 py-4 border-t border-white/10">
        {user && (
  <div className="flex items-center gap-3 px-3 py-3 rounded-xl mb-2"
    style={{ background: 'rgba(255,255,255,0.05)' }}>
    {user.avatar_url ? (
      <img src={user.avatar_url} alt="Avatar"
        className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
    ) : (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
        {user.prenom?.[0]}{user.nom?.[0]}
      </div>
    )}
    <div className="min-w-0">
      <p className="text-white text-xs font-semibold truncate">{user.prenom} {user.nom}</p>
      <p className="text-white/40 text-xs truncate">{isAdmin ? 'Administrateur' : 'Collaborateur'}</p>
    </div>
  </div>
)}
        <motion.button onClick={deconnexion}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: 'rgba(255,255,255,0.5)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Déconnexion
        </motion.button>
      </div>
    </aside>
  )
}