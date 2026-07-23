import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

  // Créer profil collaborateur si Google OAuth (premier login)
  // PGRST116 = aucune ligne trouvée avec .single() : c'est un premier login, pas une vraie erreur.
  const { data: existing, error: existingError } = await supabase
    .from('collaborateurs')
    .select('id')
    .eq('id', data.user.id)
    .single()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Erreur callback — lecture profil:', existingError.message)
    return NextResponse.redirect(`${origin}/auth?error=profile_lookup_failed`)
  }

  if (!existing) {
    const { count } = await supabase
      .from('collaborateurs')
      .select('*', { count: 'exact', head: true })

    const role = (count === 0 || count === null) ? 'admin' : 'collaborateur'
    const meta = data.user.user_metadata
    const fullName = meta?.full_name || meta?.name || ''
    const parts = fullName.split(' ')
    const prenom = parts[0] || ''
    const nom = parts.slice(1).join(' ') || ''

    const { error: insertError } = await supabase.from('collaborateurs').insert({
      id: data.user.id,
      nom,
      prenom,
      email: data.user.email,
      role,
      avatar_url: meta?.avatar_url || meta?.picture || null,
    })

    if (insertError) {
      console.error('Erreur callback — création profil:', insertError.message)
      return NextResponse.redirect(`${origin}/auth?error=profile_creation_failed`)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
