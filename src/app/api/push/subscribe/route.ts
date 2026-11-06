import { NextRequest, NextResponse } from 'next/server'
import { utilisateurCourant } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ctx = await utilisateurCourant()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const sub = await req.json().catch(() => null)
  const endpoint = sub?.endpoint, p256dh = sub?.keys?.p256dh, auth = sub?.keys?.auth
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
  const { error } = await ctx.supabase.from('push_subscriptions').upsert(
    { user_id: ctx.user.id, endpoint, p256dh, auth }, { onConflict: 'endpoint' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const ctx = await utilisateurCourant()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { endpoint } = await req.json().catch(() => ({}))
  if (!endpoint) return NextResponse.json({ error: 'Endpoint manquant' }, { status: 400 })
  await ctx.supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', ctx.user.id)
  return NextResponse.json({ success: true })
}
