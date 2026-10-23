'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/lib/useRole'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/dashboard')
  }, [isAdmin, loading, router])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--green-600)', borderTopColor: 'transparent' }} />
    </div>
  )
  if (!isAdmin) return null

  return <>{children}</>
}
