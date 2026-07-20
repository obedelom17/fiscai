'use client'

import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [pret, setPret] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function verifierSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth')
        return
      }
      setPret(true)
    }
    verifierSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/auth')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!pret) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#f0f4f1' }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}