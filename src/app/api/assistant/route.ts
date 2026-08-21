export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

function getGroq() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY manquant')
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Tools Groq ─────────────────────────────────────────────
const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'envoyer_relance_email',
      description: 'Envoie un email de relance à un client pour un dossier fiscal donné. Utilise cet outil quand l\'utilisateur demande d\'envoyer une relance ou un email à un client.',
      parameters: {
        type: 'object',
        properties: {
          client_nom: { type: 'string', description: 'Nom ou raison sociale du client' },
          type_impot: { type: 'string', description: 'Type d\'impôt (TVA, IRPP, IS, acompte)' },
          message: { type: 'string', description: 'Contenu du message de relance à envoyer' },
        },
        required: ['client_nom', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'envoyer_relance_whatsapp',
      description: 'Envoie un message WhatsApp de relance à un client. Utilise cet outil quand l\'utilisateur demande d\'envoyer un WhatsApp ou une relance WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          client_nom: { type: 'string', description: 'Nom ou raison sociale du client' },
          type_impot: { type: 'string', description: 'Type d\'impôt (TVA, IRPP, IS, acompte)' },
          message: { type: 'string', description: 'Contenu du message WhatsApp à envoyer' },
        },
        required: ['client_nom', 'message'],
      },
    },
  },
]

// ── Exécution des tools ─────────────────────────────────────
async function executerTool(
  name: string,
  args: Record<string, string>,
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<string> {
  const admin = getAdmin()

  // Trouver le client
  const { data: clients } = await admin.from('clients').select('id, raison_sociale, email_contact, telephone')
  const client = clients?.find((c: any) =>
    c.raison_sociale.toLowerCase().includes(args.client_nom.toLowerCase())
  )
  if (!client) return `Client "${args.client_nom}" introuvable dans le portefeuille.`

  // Trouver le dossier le plus récent
  const { data: dossiers } = await admin
    .from('dossiers_fiscaux')
    .select('id, type_impot, periode_annee, periode_mois, date_echeance, statut')
    .eq('client_id', client.id)
    .order('date_echeance', { ascending: false })
    .limit(1)

  const dossier = dossiers?.[0]
  if (!dossier) return `Aucun dossier trouvé pour ${client.raison_sociale}.`

  if (name === 'envoyer_relance_email') {
    const email = client.email_contact?.trim()
    if (!email) return `Email non renseigné pour ${client.raison_sociale}. Ajoutez-le dans la fiche client.`

    try {
            const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
          template_id: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
          user_id: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: email,
            from_name: 'Experts Afrique Conseils',
            message: args.message,
          },
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        return `Erreur envoi email : ${errText}`
      }
    } catch (err: any) {
      return `Erreur envoi email : ${err.message}`
    }

    await admin.from('relances').insert({
      dossier_id: dossier.id,
      client_id: client.id,
      contenu_email: args.message,
      statut: 'envoye',
      canal: 'email',
    })
    await admin.from('audit_logs').insert({
      collaborateur_id: userId,
      action: 'RELANCE_EMAIL_IA',
      details: `Relance email envoyée via assistant IA à ${client.raison_sociale}`,
    })

    return `Email de relance envoyé avec succès à ${client.raison_sociale} (${email}) pour le dossier ${dossier.type_impot} ${dossier.periode_annee}.`
  }

  if (name === 'envoyer_relance_whatsapp') {
    const tel = (client.telephone || '').replace(/[^0-9+]/g, '')
    if (!tel) return `Numéro WhatsApp non renseigné pour ${client.raison_sociale}. Ajoutez-le dans la fiche client.`

    await admin.from('relances').insert({
      dossier_id: dossier.id,
      client_id: client.id,
      contenu_email: args.message,
      statut: 'envoye_whatsapp',
      canal: 'whatsapp',
    })
    await admin.from('audit_logs').insert({
      collaborateur_id: userId,
      action: 'RELANCE_WHATSAPP_IA',
      details: `Relance WhatsApp préparée via assistant IA pour ${client.raison_sociale}`,
    })

    const waUrl = `https://wa.me/${tel}?text=${encodeURIComponent(args.message)}`
    return `WHATSAPP_OPEN:${waUrl}|Message préparé pour ${client.raison_sociale} (${tel}). Cliquez le lien pour ouvrir WhatsApp et envoyer.`
  }

  return 'Outil inconnu.'
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

  const { message, contexte, historique = [] } = await request.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

  const messagesGroq: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `Tu es FiscAl, un assistant fiscal intelligent pour le cabinet Experts Afrique Conseils au Togo.
Tu aides les collaborateurs à analyser les dossiers fiscaux de leurs clients.
Tu connais la fiscalité togolaise : TVA, IRPP, Impôt sur les Sociétés, OTR.
Tu te souviens des échanges précédents et tu en tiens compte.
Tu peux envoyer des relances email ou WhatsApp en utilisant les outils disponibles.
Quand on te demande d'envoyer une relance, génère d'abord un message professionnel adapté puis utilise l'outil approprié.
Voici les données actuelles du portefeuille :
${contexte}
Réponds en français, de manière concise et professionnelle.`,
    },
    ...historique.map((h: { role: string; content: string }) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: message },
  ]

  try {
    const groq = getGroq()

    // Premier appel avec tools
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: messagesGroq,
      tools,
      tool_choice: 'auto',
      max_tokens: 1024,
      temperature: 0.7,
    })

    const choice = completion.choices[0]
    const toolCalls = choice.message.tool_calls

    // Pas de tool call → réponse directe
    if (!toolCalls || toolCalls.length === 0) {
      return NextResponse.json({ reponse: choice.message.content })
    }

    // Exécuter les tools
    const toolResults: Groq.Chat.Completions.ChatCompletionMessageParam[] = []
    const waLinks: string[] = []

    for (const tc of toolCalls) {
      const args = JSON.parse(tc.function.arguments || '{}')
      const result = await executerTool(tc.function.name, args, supabase, user.id)

      // Extraire les liens WhatsApp
      if (result.startsWith('WHATSAPP_OPEN:')) {
        const [url, msg] = result.replace('WHATSAPP_OPEN:', '').split('|')
        waLinks.push(url)
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: msg })
      } else {
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: result })
      }
    }

    // Deuxième appel pour synthèse
    const finalCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        ...messagesGroq,
        { role: 'assistant', content: choice.message.content || '', tool_calls: toolCalls },
        ...toolResults,
      ],
      max_tokens: 512,
      temperature: 0.5,
    })

    return NextResponse.json({
      reponse: finalCompletion.choices[0].message.content,
      waLinks: waLinks.length > 0 ? waLinks : undefined,
    })

  } catch (err) {
    console.error('Groq error:', err)
    return NextResponse.json({ error: 'Erreur assistant IA' }, { status: 500 })
  }
}
