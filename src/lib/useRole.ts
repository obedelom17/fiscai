import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export function useRole() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
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