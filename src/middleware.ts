import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Laisser passer le callback OAuth (échange du code)
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next()
  }

  // Laisser passer la page 2FA (gérée côté client)
  if (pathname.startsWith('/securite')) {
    return NextResponse.next()
  }

  // Laisser passer les assets statiques
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|svg|webp|webmanifest)$/)
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  let mfaRequired = false
  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    mfaRequired = aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2'
  }

  // Si pas connecté et pas sur /auth → redirige vers /auth
  if (!user && !pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // MFA requis : bloquer l'accès aux pages protégées sauf /auth et /securite
  if (user && mfaRequired && !pathname.startsWith('/auth') && !pathname.startsWith('/securite')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.search = 'mfa=1'
    return NextResponse.redirect(url)
  }

  // Si connecté (MFA OK) et sur /auth → redirige vers /dashboard
  // Sauf écran post-inscription (?welcome=1) ou vérification MFA (?mfa=1)
  if (user && !mfaRequired && pathname === '/auth' && !searchParams.get('welcome') && !searchParams.get('mfa')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
