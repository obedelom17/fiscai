import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { message, contexte } = await request.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 })
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `Tu es FiscAl, un assistant fiscal intelligent pour le cabinet Experts Afrique Conseils au Togo.
Tu aides les collaborateurs à analyser les dossiers fiscaux de leurs clients.
Tu connais la fiscalité togolaise : TVA, IRPP, Impôt sur les Sociétés, OTR.
Voici les données actuelles du portefeuille :
${contexte}
Réponds en français, de manière concise et professionnelle.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 1024,
      temperature: 0.7,
    })

    return NextResponse.json({
      reponse: completion.choices[0].message.content
    })
  } catch (err) {
    console.error('Groq error:', err)
    return NextResponse.json({ error: 'Erreur assistant IA' }, { status: 500 })
  }
}
