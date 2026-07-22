import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY manquant')
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: collab } = await supabase
    .from('collaborateurs')
    .select('prenom, nom, email')
    .eq('id', user.id)
    .single()

  if (!collab) return NextResponse.json({ error: 'Collaborateur introuvable' }, { status: 404 })

  const { dossierId, clientEmail, clientNom, contenu, canal } = await request.json()

  if (!dossierId || !contenu) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  try {
    if (canal === 'whatsapp') {
      await supabase.from('relances').insert({
        dossier_id: dossierId,
        client_id: null,
        contenu_email: contenu,
        statut: 'envoye_whatsapp',
        canal: 'whatsapp',
      })
      return NextResponse.json({ success: true, canal: 'whatsapp' })
    }

    const fromName = `${collab.prenom} ${collab.nom} via FiscAl`
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@fiscai.com'

    const { data: emailData, error: emailError } = await getResend().emails.send({
      from: `${fromName} <${fromEmail}>`,
      replyTo: collab.email,
      to: [clientEmail],
      subject: `Relance fiscale — ${clientNom}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#1a3c2e,#2d6a4f);padding:24px;border-radius:12px;margin-bottom:24px;">
            <h1 style="color:white;margin:0;font-size:20px;">FiscAl — Experts Afrique Conseils</h1>
            <p style="color:#86efac;margin:4px 0 0;font-size:13px;">Gestion fiscale Togo</p>
          </div>
          <div style="color:#374151;line-height:1.7;font-size:14px;white-space:pre-line;">${contenu}</div>
          <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;">
            <p style="color:#6b7280;font-size:12px;margin:0;">
              Envoyé par <strong>${collab.prenom} ${collab.nom}</strong> via FiscAl<br/>
              Répondre à : <a href="mailto:${collab.email}" style="color:#2d6a4f;">${collab.email}</a>
            </p>
          </div>
        </div>
      `,
    })

    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 500 })
    }

    await supabase.from('relances').insert({
      dossier_id: dossierId,
      client_id: null,
      contenu_email: contenu,
      statut: 'envoye',
      canal: 'email',
    })

    return NextResponse.json({ success: true, emailId: emailData?.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur envoi' }, { status: 500 })
  }
}
