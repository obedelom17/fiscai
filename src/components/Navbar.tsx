'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function deconnexion() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const liens = [
    { href: '/dashboard/clients', label: 'Clients' },
    { href: '/dashboard/dossiers', label: 'Dossiers' },
    { href: '/dashboard/assistant', label: 'Assistant IA' },
    { href: '/admin/portefeuilles', label: 'Portefeuilles' },
    { href: '/admin/statistiques', label: 'Statistiques' },
  ]

  return (
    <nav style={{ background: 'linear-gradient(135deg, #0f2318 0%, #1a3c2e 60%, #2d6a4f 100%)' }}
      className="px-6 flex items-center justify-between shadow-xl sticky top-0 z-50">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 py-3">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 2 }}
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #e8a317, #f5c842)' }}>
          <span className="text-white text-lg font-black">F</span>
        </motion.div>
        <div>
          <span className="text-white text-lg font-bold tracking-wide">FiscAl</span>
          <p className="text-green-300 text-xs leading-none">Experts Afrique Conseils</p>
        </div>
      </motion.div>

      {/* Liens */}
      <div className="flex items-center">
        {liens.map((lien, i) => {
          const actif = pathname === lien.href
          return (
            <motion.a
              key={lien.href}
              href={lien.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              whileHover={{ color: '#e8a317' }}
              className="px-4 py-5 text-sm font-medium transition-colors relative"
              style={{ color: actif ? '#e8a317' : 'rgba(255,255,255,0.75)' }}>
              {lien.label}
              {actif && (
                <motion.div
                  layoutId="navbar-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: '#e8a317' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.a>
          )
        })}
        <motion.button
          onClick={deconnexion}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'rgba(232,163,23,0.15)', color: '#e8a317', border: '1px solid rgba(232,163,23,0.3)' }}>
          Déconnexion
        </motion.button>
      </div>
    </nav>
  )
}