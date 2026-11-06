import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifierCron } from '@/lib/auth-server'
import { executerQuotidien } from '@/lib/cron-quotidien'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Appelé chaque jour par Vercel Cron (vercel.json). Nécessite CRON_SECRET. */
export async function GET(req: NextRequest) {
  if (!verifierCron(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const bilan = await executerQuotidien(createAdminClient())
    return NextResponse.json({ ok: true, ...bilan })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
