'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/lib/useRole'
import Sidebar from '@/components/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/dashboard')
  }, [isAdmin, loading])

  if (loading) return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 flex items-center justify-center" style={{ background: '#f0f4f1' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
      </main>
    </div>
  )

  if (!isAdmin) return null

  return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
