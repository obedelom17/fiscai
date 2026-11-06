'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type Cabinet = { id: string; nom: string; email_contact: string | null; code_invitation: string }

/**
 * Cabinet de l'utilisateur connecté.
 * `aucunCabinet` = profil existant mais pas encore rattaché (il doit passer par /onboarding).
 */
export function useCabinet() {
  const [cabinet, setCabinet] = useState<Cabinet | null>(null)
  const [loading, setLoading] = useState(true)
  const [aucunCabinet, setAucunCabinet] = useState(false)
  const [operateur, setOperateur] = useState(false)

  const charger = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: profil } = await supabase.from('collaborateurs').select('cabinet_id').eq('id', user.id).maybeSingle()
    if (!profil?.cabinet_id) {
      setCabinet(null); setAucunCabinet(true); setLoading(false); return
    }
    const [{ data: c }, { data: op }] = await Promise.all([
      supabase.from('cabinets').select('id, nom, email_contact, code_invitation').eq('id', profil.cabinet_id).maybeSingle(),
      supabase.from('operateurs').select('user_id').eq('user_id', user.id).maybeSingle(),
    ])
    setCabinet((c as Cabinet) ?? null)
    setAucunCabinet(false)
    setOperateur(!!op)
    setLoading(false)
  }, [])

  useEffect(() => { charger() }, [charger])
  return { cabinet, loading, aucunCabinet, operateur, recharger: charger }
}
