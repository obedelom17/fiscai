'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type Message = { role: 'user' | 'assistant'; content: string }

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bonjour. Je suis FiscAl, votre assistant fiscal intelligent. Posez-moi vos questions sur vos dossiers clients, échéances OTR ou obligations fiscales togolaises.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contexte, setContexte] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { chargerContexte() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function chargerContexte() {
    const { data: clients } = await supabase.from('clients').select('raison_sociale, nif, regime_fiscal')
    const { data: dossiers } = await supabase
      .from('dossiers_fiscaux')
      .select('type_impot, statut, date_echeance, periode_mois, periode_annee, clients(raison_sociale)')
      .order('date_echeance', { ascending: true })
      .limit(20)

    const ctx = `
CLIENTS (${clients?.length || 0}) :
${clients?.map(c => `- ${c.raison_sociale} (NIF: ${c.nif}, Régime: ${c.regime_fiscal})`).join('\n') || 'Aucun'}

DOSSIERS FISCAUX RÉCENTS :
${dossiers?.map(d => `- ${(d.clients as any)?.raison_sociale} | ${d.type_impot} | ${d.statut} | Échéance: ${new Date(d.date_echeance).toLocaleDateString('fr-FR')}`).join('\n') || 'Aucun'}
`
    setContexte(ctx)
  }

  async function envoyer() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg, contexte })
    })
    const data = await res.json()
    setMessages(prev => [...prev, { role: 'assistant', content: data.reponse }])
    setLoading(false)
  }

  const suggestions = [
    'Quels clients ont des dossiers TVA en attente ?',
    'Quelles sont les échéances critiques cette semaine ?',
    'Résume le statut de conformité du cabinet',
    'Quels clients sont en retard sur leur IRPP ?',
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0f4f1' }}>
      <Navbar />

      <div className="max-w-4xl w-full mx-auto px-6 py-8 flex flex-col flex-1">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: '#1a3c2e' }}>Assistant IA</h1>
          <p className="text-gray-500 mt-1">Interrogez vos données fiscales en langage naturel — Modèle Llama 3.1 via Groq</p>
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => { setInput(s) }}
                className="text-left p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-sm text-gray-600 hover:border-green-300">
                <div className="w-6 h-6 rounded-lg mb-2 flex items-center justify-center"
                  style={{ background: '#f0f4f1' }}>
                  <svg className="w-3 h-3" fill="none" stroke="#2d6a4f" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
                  </svg>
                </div>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Zone messages */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 overflow-y-auto space-y-4"
          style={{ minHeight: '350px', maxHeight: '450px' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                  style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                  <span className="text-white text-xs font-bold">F</span>
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'text-gray-700 rounded-bl-sm border border-gray-100'
              }`}
                style={msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }
                  : { background: '#f8fafb' }}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                  style={{ background: '#f0f4f1' }}>
                  <svg className="w-4 h-4" fill="none" stroke="#2d6a4f" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
                <span className="text-white text-xs font-bold">F</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  {[0, 150, 300].map(delay => (
                    <div key={delay} className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: '#2d6a4f', animationDelay: `${delay}ms` }}></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex items-center gap-3">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && envoyer()}
            placeholder="Ex: Quels clients ont des dossiers TVA en attente ?"
            className="flex-1 px-4 py-2.5 text-sm outline-none text-gray-700 placeholder-gray-400" />
          <button onClick={envoyer} disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-all flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a3c2e)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}