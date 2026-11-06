'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCabinet } from '@/lib/useCabinet'

/** Redirige vers /onboarding tant que l'utilisateur n'est rattaché à aucun cabinet. */
export default function CabinetGuard() {
  const router = useRouter()
  const { aucunCabinet, loading } = useCabinet()
  useEffect(() => { if (!loading && aucunCabinet) router.replace('/onboarding') }, [loading, aucunCabinet, router])
  return null
}
