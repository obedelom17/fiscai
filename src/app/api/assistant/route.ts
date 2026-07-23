import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

function getGroq() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY manquant')
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
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
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { message, contexte, historique = [] } = await request.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 })
  }

  // Construire les messages avec historique (mémoire de conversation)
  const messagesGroq: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: `Tu es FiscAl, un assistant fiscal intelligent pour le cabinet Experts Afrique Conseils au Togo.
Tu aides les collaborateurs à analyser les dossiers fiscaux de leurs clients.
Tu connais la fiscalité togolaise : TVA, IRPP, Impôt sur les Sociétés, OTR.
Tu te souviens des échanges précédents dans cette conversation et tu en tiens compte.
Voici les données actuelles du portefeuille :
${contexte}
Réponds en français, de manière concise et professionnelle.`
    },
    // Historique de la conversation (borné pour éviter les abus/coûts)
    ...(Array.isArray(historique) ? historique.slice(-20) : []).map((h: { role: string; content: string }) => ({
      role: h.role as 'user' | 'assistant',
      content: String(h.content ?? '').slice(0, 4000)
    })),
    // Nouveau message
    { role: 'user' as const, content: message }
  ]

  try {
    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: messagesGroq,
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
