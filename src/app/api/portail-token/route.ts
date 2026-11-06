import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { utilisateurCourant } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

/** POST { clientId, action: 'generer' | 'revoquer' } — le RLS limite aux clients de l'utilisateur (ou admin). */
export async function POST(req: NextRequest) {
  const ctx = await utilisateurCourant()
  if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { clientId, action } = await req.json().catch(() => ({}))
  if (!clientId || !['generer', 'revoquer'].includes(action)) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

  const patch = action === 'generer'
    ? { portail_token: randomBytes(24).toString('base64url'), portail_actif: true }
    : { portail_token: null, portail_actif: false }

  const { data, error } = await ctx.supabase.from('clients').update(patch).eq('id', clientId).select('portail_token').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Client introuvable ou accès refusé' }, { status: 403 })
  return NextResponse.json({ token: data.portail_token })
}
