import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { upsertCollaborateurProfile, resolveCollaborateurRole } from '@/lib/collaborateur-profile'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=no_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth?error=exchange_failed`)
  }

  // Créer ou mettre à jour le profil collaborateur (Google OAuth)
  const role = await resolveCollaborateurRole(supabase)
  const meta = data.user.user_metadata
  const fullName = meta?.full_name || meta?.name || ''
  const parts = fullName.split(' ')
  const prenom = parts[0] || ''
  const nom = parts.slice(1).join(' ') || ''

  await upsertCollaborateurProfile(supabase, {
    id: data.user.id,
    nom,
    prenom,
    email: data.user.email ?? '',
    role,
    avatar_url: meta?.avatar_url || meta?.picture || null,
  })

  return NextResponse.redirect(`${origin}${next}`)
}
