import { NextResponse } from 'next/server'
import { utilisateurCourant } from '@/lib/auth-server'
import { genererClesVapid } from '@/lib/push-server'

export const dynamic = 'force-dynamic'

/** Opérateurs de la plateforme uniquement : génère une paire de clés VAPID à copier dans les variables Cloudflare. */
export async function GET() {
  const ctx = await utilisateurCourant()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: op } = await ctx.supabase.from('operateurs').select('user_id').eq('user_id', ctx.user.id).maybeSingle()
  if (!op) return NextResponse.json({ error: 'Réservé aux opérateurs de la plateforme' }, { status: 403 })
  const k = genererClesVapid()
  return NextResponse.json({
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: k.publicKey,
    VAPID_PRIVATE_KEY: k.privateKey,
    note: 'Copiez ces deux valeurs dans Cloudflare > Workers > fiscai > Settings > Variables and Secrets, puis redéployez. Ne partagez jamais la clé privée.',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
