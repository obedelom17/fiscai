'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { useRole } from '@/lib/useRole'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/Toast'

const SIDEBAR_KEY = 'fiscai_sidebar_collapsed'
const notifiedIds = new Set<string>()

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { isAdmin, loading } = useRole()
  const { toast } = useToast()
  const [user, setUser] = useState<{ prenom: string; nom: string; email: string; avatar_url: string | null } | null>(null)
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: string }[]>([])
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const initialLoadDone = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY)
    if (saved === 'true') setCollapsed(true)
  }, [])

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleCollapsed() {
    setCollapsed(prev => {
      localStorage.setItem(SIDEBAR_KEY, String(!prev))
      return !prev
    })
  }

  useEffect(() => {
    async function chargerNotifications() {
      const dans5 = new Date(); dans5.setDate(dans5.getDate() + 5)
      const aujourd = new Date()
      const { data } = await supabase
        .from('dossiers_fiscaux')
        .select('id, type_impot, date_echeance, clients(raison_sociale)')
        .neq('statut', 'televerse_otr')

      const notifs: { id: string; message: string; type: string }[] = []
      data?.forEach((d: any) => {
        const ech = new Date(d.date_echeance)
        if (ech < aujourd) {
          notifs.push({ id: d.id, message: `${d.clients?.raison_sociale} — ${d.type_impot} en retard`, type: 'retard' })
        } else if (ech <= dans5) {
          notifs.push({ id: d.id, message: `${d.clients?.raison_sociale} — ${d.type_impot} échéance le ${ech.toLocaleDateString('fr-FR')}`, type: 'urgent' })
        }
      })

      if (initialLoadDone.current) {
        notifs.forEach(n => {
          if (!notifiedIds.has(n.id)) {
            notifiedIds.add(n.id)
            toast(n.message, n.type === 'retard' ? 'error' : 'warning')
          }
        })
      } else {
        notifs.forEach(n => notifiedIds.add(n.id))
        initialLoadDone.current = true
      }

      setNotifications(notifs)
    }

    chargerNotifications()
    const channel = supabase.channel('sidebar-dossiers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers_fiscaux' }, () => chargerNotifications())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    async function charger() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const { data } = await supabase.from('collaborateurs').select('prenom, nom, email, avatar_url').eq('id', u.id).single()
      setUser(data)
    }
    charger()
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  async function deconnexion() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // Composant cloche avec dropdown
  const Cloche = ({ isDrawer }: { isDrawer: boolean }) => (
    <div ref={notifRef} className="relative">
      <button
        onClick={() => setShowNotifDropdown(prev => !prev)}
        className="relative p-1.5 rounded-lg inline-flex flex-shrink-0 transition-colors hover:bg-white/10"
        style={{ background: notifications.length > 0 ? 'rgba(232,163,23,0.15)' : 'transparent' }}
        title="Notifications">
        <svg className="w-4 h-4" fill="none" stroke={notifications.length > 0 ? '#e8a317' : 'rgba(255,255,255,0.4)'} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
            style={{ background: '#dc2626', fontSize: '9px' }}>
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown notifications */}
      <AnimatePresence>
        {showNotifDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              width: '310px',
              left: '230px',
              top: '80px',
              zIndex: 9999,
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              background: '#132218',
              border: '1px solid rgba(255,255,255,0.12)',
              maxHeight: 'calc(100vh - 100px)',
              display: 'flex',
              flexDirection: 'column',
            }}>
            {/* En-tête */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="#e8a317" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm font-semibold text-white">Notifications</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#dc2626', color: 'white' }}>
                  {notifications.length}
                </span>
                <button onClick={() => setShowNotifDropdown(false)} className="text-white/40 hover:text-white text-lg leading-none">×</button>
              </div>
            </div>

            {/* Liste */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-white/40">Aucune alerte en cours</p>
                </div>
              ) : notifications.map((n, i) => (
                <Link key={n.id} href="/dashboard/dossiers"
                  onClick={() => setShowNotifDropdown(false)}
                  className="flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors block">
                  <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full"
                    style={{ background: n.type === 'retard' ? '#dc2626' : '#e8a317' }} />
                  <div>
                    <p className="text-xs text-white/90 leading-relaxed font-medium">{n.message}</p>
                    <p className="text-xs mt-0.5" style={{ color: n.type === 'retard' ? '#fca5a5' : '#fcd34d' }}>
                      {n.type === 'retard' ? 'En retard' : 'Échéance proche'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pied */}
            <div className="px-4 py-3 border-t border-white/10">
              <button
                onClick={() => { setShowNotifDropdown(false); router.push('/dashboard/dossiers') }}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-colors w-full"
                style={{ background: 'rgba(232,163,23,0.15)', color: '#e8a317' }}>
                Voir tous les dossiers
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const liensCollaborateur = [
    { href: '/dashboard', label: 'Accueil', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { href: '/dashboard/clients', label: 'Clients', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
    { href: '/dashboard/dossiers', label: 'Dossiers', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { href: '/dashboard/calendrier', label: 'Calendrier', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { href: '/dashboard/assistant', label: 'Assistant IA', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" /></svg> },
  ]
  const liensAdmin = [
    { href: '/admin/portefeuilles', label: 'Portefeuilles', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { href: '/admin/statistiques', label: 'Statistiques', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  ]
  const liens = isAdmin ? [...liensCollaborateur, ...liensAdmin] : liensCollaborateur

  const NavLink = ({ lien, isDrawer }: { lien: typeof liensCollaborateur[0]; isDrawer: boolean }) => {
    const actif = pathname === lien.href
    return (
      <Link href={lien.href}
        title={collapsed && !isDrawer ? lien.label : undefined}
        className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all hover:translate-x-0.5 ${collapsed && !isDrawer ? 'justify-center px-0' : ''}`}
        style={actif
          ? { background: 'rgba(232,163,23,0.15)', color: '#e8a317', borderLeft: collapsed && !isDrawer ? 'none' : '3px solid #e8a317' }
          : { color: 'rgba(255,255,255,0.65)', borderLeft: collapsed && !isDrawer ? 'none' : '3px solid transparent' }}>
        <span style={{ color: actif ? '#e8a317' : 'rgba(255,255,255,0.5)' }} className="flex-shrink-0">{lien.icon}</span>
        {(!collapsed || isDrawer) && <span className="truncate">{lien.label}</span>}
      </Link>
    )
  }

  const SidebarContent = ({ isDrawer = false }: { isDrawer?: boolean }) => (
    <div className="flex flex-col h-full">

      {/* Logo + collapse */}
      <div className="border-b border-white/10" style={{ padding: collapsed && !isDrawer ? '12px 0' : '12px' }}>
        {collapsed && !isDrawer ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #e8a317, #f5c842)' }}>
              <span className="text-white text-base font-black">F</span>
            </div>
            <button onClick={toggleCollapsed}
              className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              title="Agrandir">
              <svg className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #e8a317, #f5c842)' }}>
              <span className="text-white text-base font-black">F</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm leading-none">FiscAl</p>
              <p className="text-green-400 text-xs mt-0.5 truncate">Experts Afrique Conseils</p>
            </div>
            {isDrawer ? (
              <button className="text-white/50 hover:text-white p-1 flex-shrink-0" onClick={() => setOpen(false)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            ) : (
              <button onClick={toggleCollapsed}
                className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white flex-shrink-0 transition-colors"
                title="Réduire">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {!loading && liens.map(lien => <NavLink key={lien.href} lien={lien} isDrawer={isDrawer} />)}

        <div className="pt-4 mt-2 border-t border-white/10">
          {(!collapsed || isDrawer) ? (
            <div className="flex items-center justify-between px-2.5 mb-2">
              <p className="text-xs text-white/30 uppercase tracking-wider">Compte</p>
              <Cloche isDrawer={isDrawer} />
            </div>
          ) : (
            <div className="flex justify-center mb-2">
              <Cloche isDrawer={isDrawer} />
            </div>
          )}

          <Link href="/parametres"
            title={collapsed && !isDrawer ? 'Paramètres' : undefined}
            className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all ${collapsed && !isDrawer ? 'justify-center px-0' : ''}`}
            style={pathname === '/parametres'
              ? { background: 'rgba(232,163,23,0.15)', color: '#e8a317', borderLeft: collapsed && !isDrawer ? 'none' : '3px solid #e8a317' }
              : { color: 'rgba(255,255,255,0.65)', borderLeft: collapsed && !isDrawer ? 'none' : '3px solid transparent' }}>
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: pathname === '/parametres' ? '#e8a317' : 'rgba(255,255,255,0.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {(!collapsed || isDrawer) && <span className="truncate">Paramètres</span>}
          </Link>
        </div>
      </nav>

      {/* Profil + Déco */}
      <div className="px-2 py-3 border-t border-white/10">
        {user && (
          <div className={`flex items-center gap-3 px-2 py-2.5 rounded-xl mb-1 ${collapsed && !isDrawer ? 'justify-center' : ''}`}
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" title={collapsed && !isDrawer ? `${user.prenom} ${user.nom}` : undefined} />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}
                title={collapsed && !isDrawer ? `${user.prenom} ${user.nom}` : undefined}>
                {user.prenom?.[0]}{user.nom?.[0]}
              </div>
            )}
            {(!collapsed || isDrawer) && (
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user.prenom} {user.nom}</p>
                <p className="text-white/40 text-xs truncate">{isAdmin ? 'Administrateur' : 'Collaborateur'}</p>
              </div>
            )}
          </div>
        )}
        <button onClick={deconnexion}
          title={collapsed && !isDrawer ? 'Déconnexion' : undefined}
          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors ${collapsed && !isDrawer ? 'justify-center' : ''}`}
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {(!collapsed || isDrawer) && <span className="truncate">Déconnexion</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Topbar mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ background: 'linear-gradient(135deg, #0f2318, #1a3c2e)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #e8a317, #f5c842)' }}>
            <span className="text-white text-sm font-black">F</span>
          </div>
          <span className="text-white font-bold text-sm">FiscAl</span>
        </div>
        <div className="flex items-center gap-2">
          <Cloche isDrawer={true} />
          <button onClick={() => setOpen(true)} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar desktop */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 224 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="hidden lg:flex h-screen flex-col sticky top-0 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #0f2318 0%, #1a3c2e 100%)' }}>
        <SidebarContent />
      </motion.aside>

      {/* Drawer mobile */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed top-0 left-0 h-full w-72 z-50 lg:hidden flex flex-col"
              style={{ background: 'linear-gradient(180deg, #0f2318 0%, #1a3c2e 100%)' }}>
              <SidebarContent isDrawer />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
