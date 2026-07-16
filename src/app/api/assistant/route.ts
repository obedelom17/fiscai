import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: NextRequest) {
  const { message, contexte } = await request.json()

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
}