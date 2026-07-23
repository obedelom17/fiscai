import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Admin client avec service role (serveur uniquement)
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant')
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    // Récupérer l'utilisateur connecté depuis la session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const targetUserId: string = body.userId || user.id

    // Vérifier les droits : un collaborateur ne peut supprimer que son propre compte
    // Un admin peut supprimer n'importe quel compte
    const { data: requester } = await supabase
      .from('collaborateurs')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!requester) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })
    }

    // Collaborateur ne peut supprimer que lui-même
    if (requester.role !== 'admin' && targetUserId !== user.id) {
      return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
    }

    // Bloquer si c'est le dernier admin
    if (targetUserId === user.id || requester.role === 'admin') {
      const { data: target } = await supabase
        .from('collaborateurs')
        .select('role')
        .eq('id', targetUserId)
        .single()

      if (target?.role === 'admin') {
        const { data: admins } = await supabase
          .from('collaborateurs')
          .select('id')
          .eq('role', 'admin')
        if (admins && admins.length <= 1) {
          return NextResponse.json({ error: 'Impossible de supprimer le dernier administrateur' }, { status: 400 })
        }
      }
    }

    const admin = createAdminClient()

    // 1. Supprimer les données liées dans collaborateurs (cascade si FK configurée, sinon manuel)
    await admin.from('collaborateurs').delete().eq('id', targetUserId)

    // 2. Supprimer le compte auth — empêche toute reconnexion
    const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId)
    if (deleteError) {
      return NextResponse.json({ error: 'Erreur suppression auth: ' + deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
