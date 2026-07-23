import type { SupabaseClient } from '@supabase/supabase-js'

export type CollaborateurProfileInput = {
  id: string
  nom: string
  prenom: string
  email: string
  role: string
  avatar_url?: string | null
}

/** Crée ou met à jour le profil collaborateur (idempotent — gère les triggers DB). */
export async function upsertCollaborateurProfile(
  supabase: SupabaseClient,
  profile: CollaborateurProfileInput
) {
  const { data: existing } = await supabase
    .from('collaborateurs')
    .select('id, role')
    .eq('id', profile.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('collaborateurs')
      .update({
        nom: profile.nom,
        prenom: profile.prenom,
        email: profile.email,
        avatar_url: profile.avatar_url ?? null,
      })
      .eq('id', profile.id)
    return { error }
  }

  const { error } = await supabase.from('collaborateurs').insert(profile)
  if (error?.code === '23505') {
    const { error: updateError } = await supabase
      .from('collaborateurs')
      .update({
        nom: profile.nom,
        prenom: profile.prenom,
        email: profile.email,
        avatar_url: profile.avatar_url ?? null,
      })
      .eq('id', profile.id)
    return { error: updateError }
  }

  return { error }
}

/** Détermine le rôle à attribuer (admin si aucun admin existant). */
export async function resolveCollaborateurRole(supabase: SupabaseClient) {
  const { count } = await supabase
    .from('collaborateurs')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')
  return (count === 0 || count === null) ? 'admin' : 'collaborateur'
}

/** Détermine si l'utilisateur doit compléter la vérification MFA. */
export async function needsMfaVerification(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error || !data) return false
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
}

/** Retourne le facteur TOTP vérifié de l'utilisateur, s'il existe. */
export async function getVerifiedTotpFactor(supabase: SupabaseClient) {
  const { data } = await supabase.auth.mfa.listFactors()
  return data?.totp?.find((f) => f.status === 'verified') ?? null
}
