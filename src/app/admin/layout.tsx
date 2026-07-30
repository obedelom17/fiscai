'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/lib/useRole'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/Toast'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/dashboard')
  }, [isAdmin, loading, router])

  if (loading || !isAdmin) return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 pt-14 lg:pt-0 flex items-center justify-center" style={{ background: '#f0f4f1' }}>
          {!isAdmin && !loading ? null : (
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
          )}
        </main>
      </div>
    </ToastProvider>
  )

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
