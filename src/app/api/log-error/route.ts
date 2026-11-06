import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { evaluerLimite } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const coupe = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : null)

/** Journal d'erreurs interne : reçoit les erreurs affichées par error.tsx. Limité par IP. */
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient()
    const ip = (req.headers.get('x-forwarded-for') || 'inconnu').split(',')[0].trim()
    const depuis = new Date(Date.now() - 60_000).toISOString()
    const { count } = await admin.from('api_usage').select('*', { count: 'exact', head: true }).eq('key', `ip:${ip}`).eq('route', 'log-error').gte('created_at', depuis)
    if (!evaluerLimite(count ?? 0, 0, { parMinute: 10, parJour: 1 }).ok) return NextResponse.json({ ok: false }, { status: 429 })
    await admin.from('api_usage').insert({ key: `ip:${ip}`, route: 'log-error' })

    const b = await req.json().catch(() => ({}))
    await admin.from('error_logs').insert({
      message: coupe(b.message, 500) ?? 'Erreur inconnue',
      digest: coupe(b.digest, 100),
      url: coupe(b.url, 300),
      stack: coupe(b.stack, 2000),
      user_agent: coupe(req.headers.get('user-agent'), 200),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
