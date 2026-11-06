import type { SupabaseClient } from '@supabase/supabase-js'

export const PARAMETRES_DEFAUT = {
  relances_auto: false,
  recap_mensuel: false,
  push_digest: true,
} as const

export type CleParametre = keyof typeof PARAMETRES_DEFAUT

/** Paramètres d'un cabinet. Côté serveur (service role), `cabinetId` est obligatoire ; côté navigateur le RLS filtre. */
export async function lireParametres(supabase: SupabaseClient, cabinetId?: string): Promise<Record<CleParametre, boolean>> {
  const out: Record<CleParametre, boolean> = { ...PARAMETRES_DEFAUT }
  let q = supabase.from('parametres').select('cle, valeur')
  if (cabinetId) q = q.eq('cabinet_id', cabinetId)
  const { data } = await q
  for (const r of data ?? []) {
    if (r.cle in out) out[r.cle as CleParametre] = r.valeur === true
  }
  return out
}
