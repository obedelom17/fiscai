'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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
    <nav style={{ background: 'linear-gradient(135deg, #1a3c2e 0%, #2d6a4f 100%)' }}
      className="px-6 py-0 flex items-center justify-between shadow-lg sticky top-0 z-50">
      
      {/* Logo */}
      <div className="flex items-center gap-3 py-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #e8a317, #f5c842)' }}>
          <span className="text-white text-lg font-black">F</span>
        </div>
        <div>
          <span className="text-white text-lg font-bold tracking-wide">FiscAl</span>
          <p className="text-green-300 text-xs leading-none">Experts Afrique Conseils</p>
        </div>
      </div>

      {/* Liens */}
      <div className="flex items-center">
        {liens.map(lien => (
          <a key={lien.href} href={lien.href}
            className="px-4 py-5 text-sm font-medium transition-all relative"
            style={{
              color: pathname === lien.href ? '#e8a317' : 'rgba(255,255,255,0.75)',
              borderBottom: pathname === lien.href ? '3px solid #e8a317' : '3px solid transparent',
            }}>
            {lien.label}
          </a>
        ))}
        <button onClick={deconnexion}
          className="ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'rgba(232,163,23,0.15)', color: '#e8a317', border: '1px solid rgba(232,163,23,0.3)' }}>
          Déconnexion
        </button>
      </div>
    </nav>
  )
}