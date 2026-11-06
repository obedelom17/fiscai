import { createClient } from '@supabase/supabase-js'

/** Client service role : serveur uniquement, contourne le RLS. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
