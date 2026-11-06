import { createServerSupabase } from './supabase-server'

/** Utilisateur connecté + rôle, ou null. Utilise la session (cookies), donc le RLS s'applique. */
export async function utilisateurCourant() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('collaborateurs').select('role').eq('id', user.id).single()
  return { supabase, user, role: (data?.role ?? 'collaborateur') as 'admin' | 'collaborateur' }
}

export function verifierCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}
