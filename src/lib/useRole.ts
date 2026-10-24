'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { usePersistentState } from '@/lib/cache'

export function useRole() {
  const [role, setRole] = usePersistentState<string | null>('role', null)
  const [loading, setLoading] = useState(role === null)

  useEffect(() => {
    if (role !== null) return
    const supabase = createClient()
    async function charger() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('collaborateurs')
        .select('role')
        .eq('id', user.id)
        .single()
      setRole(data?.role || 'collaborateur')
      setLoading(false)
    }
    charger()
  }, [])

  return { role, loading, isAdmin: role === 'admin' }
}
